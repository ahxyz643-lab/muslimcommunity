import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CallScreen from "@/components/CallScreen";

export interface CallUser {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface IncomingCall {
  conversationId: string;
  caller: CallUser;
  isVideo: boolean;
}

interface ActiveCall {
  conversationId: string;
  otherUser: CallUser;
  isVideo: boolean;
  isIncoming: boolean;
}

interface CallContextValue {
  startCall: (conversationId: string, otherUser: CallUser, isVideo: boolean) => void;
  activeCall: ActiveCall | null;
}

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};

// WebAudio ringtone reused for incoming preview before accept
const useRingtone = () => {
  const ref = useRef<{ stop: () => void } | null>(null);
  const start = useCallback(() => {
    if (ref.current) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      let stopped = false;
      const beep = (freq: number, dur: number, when: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.3, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(g).connect(master);
        osc.start(when);
        osc.stop(when + dur + 0.05);
      };
      const schedule = () => {
        if (stopped) return;
        const t = ctx.currentTime;
        beep(440, 0.4, t);
        beep(480, 0.4, t + 0.5);
        beep(440, 0.4, t + 1.2);
        beep(480, 0.4, t + 1.7);
        master.gain.setValueAtTime(1, t);
      };
      schedule();
      const interval = setInterval(schedule, 3000);
      // vibrate on mobile
      if ("vibrate" in navigator) {
        try { (navigator as any).vibrate?.([400, 200, 400, 200, 400]); } catch {}
        const vib = setInterval(() => {
          try { (navigator as any).vibrate?.([400, 200, 400]); } catch {}
        }, 3000);
        ref.current = {
          stop: () => {
            stopped = true;
            clearInterval(interval);
            clearInterval(vib);
            try { (navigator as any).vibrate?.(0); } catch {}
            try { master.disconnect(); } catch {}
            try { ctx.close(); } catch {}
          },
        };
      } else {
        ref.current = {
          stop: () => {
            stopped = true;
            clearInterval(interval);
            try { master.disconnect(); } catch {}
            try { ctx.close(); } catch {}
          },
        };
      }
    } catch {}
  }, []);
  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
  }, []);
  return { start, stop };
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const ringtone = useRingtone();
  const browserNotifRef = useRef<Notification | null>(null);

  // Subscribe to a user-targeted channel for ring signals
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-ring-${user.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
        if (!payload || payload.toUserId !== user.id) return;
        if (activeCall || incomingCall) return;
        setIncomingCall({
          conversationId: payload.conversationId,
          caller: payload.caller,
          isVideo: !!payload.isVideo,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, activeCall, incomingCall]);

  // Ringtone + browser notification on incoming
  useEffect(() => {
    if (!incomingCall) return;
    ringtone.start();
    // Browser notification fallback (for when tab is in background)
    if ("Notification" in window) {
      const showNotif = () => {
        try {
          const n = new Notification(`Incoming ${incomingCall.isVideo ? "video" : "voice"} call`, {
            body: incomingCall.caller.display_name || incomingCall.caller.username || "Someone is calling you",
            icon: incomingCall.caller.avatar_url || "/app-logo.png",
            tag: `call-${incomingCall.conversationId}`,
            requireInteraction: true,
          });
          n.onclick = () => { window.focus(); n.close(); };
          browserNotifRef.current = n;
        } catch {}
      };
      if (Notification.permission === "granted") showNotif();
      else if (Notification.permission === "default") {
        Notification.requestPermission().then((p) => { if (p === "granted") showNotif(); }).catch(() => {});
      }
    }
    return () => {
      ringtone.stop();
      browserNotifRef.current?.close();
      browserNotifRef.current = null;
    };
  }, [incomingCall, ringtone]);

  const startCall = useCallback((conversationId: string, otherUser: CallUser, isVideo: boolean) => {
    if (!user) return;
    setActiveCall({ conversationId, otherUser, isVideo, isIncoming: false });
    // Notify recipient via their personal ring channel
    const ch = supabase.channel(`user-ring-${otherUser.user_id}`, { config: { broadcast: { self: false } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({
          type: "broadcast",
          event: "incoming-call",
          payload: {
            toUserId: otherUser.user_id,
            conversationId,
            isVideo,
            caller: {
              user_id: user.id,
              display_name: (user.user_metadata as any)?.display_name || null,
              username: (user.user_metadata as any)?.username || null,
              avatar_url: (user.user_metadata as any)?.avatar_url || null,
            },
          },
        });
        setTimeout(() => supabase.removeChannel(ch), 800);
      }
    });
  }, [user]);

  const acceptIncoming = () => {
    if (!incomingCall) return;
    setActiveCall({
      conversationId: incomingCall.conversationId,
      otherUser: incomingCall.caller,
      isVideo: incomingCall.isVideo,
      isIncoming: true,
    });
    setIncomingCall(null);
  };

  const declineIncoming = () => {
    if (!incomingCall || !user) return;
    const ch = supabase.channel(`call-${incomingCall.conversationId}`, { config: { broadcast: { self: false } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "call-signal", payload: { type: "end", from: user.id } });
        setTimeout(() => supabase.removeChannel(ch), 500);
      }
    });
    setIncomingCall(null);
  };

  return (
    <CallContext.Provider value={{ startCall, activeCall }}>
      {children}

      {/* Full-screen incoming call overlay — appears on ANY page */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
          <div className="mb-6 relative">
            <img
              src={incomingCall.caller.avatar_url || "https://i.pravatar.cc/150"}
              alt=""
              className="h-28 w-28 rounded-full object-cover border-4 border-primary"
            />
            <span className="absolute inset-0 -m-2 animate-ping rounded-full border-4 border-primary/40" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {incomingCall.caller.display_name || incomingCall.caller.username || "Someone"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Incoming {incomingCall.isVideo ? "video" : "voice"} call...
          </p>
          <div className="mt-10 flex gap-10">
            <button
              onClick={declineIncoming}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg"
              aria-label="Decline"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
            <button
              onClick={acceptIncoming}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-pulse"
              aria-label="Accept"
            >
              <Phone className="h-7 w-7" />
            </button>
          </div>
        </div>
      )}

      {/* Active call full-screen — appears above ANY route */}
      {activeCall && user && (
        <CallScreen
          conversationId={activeCall.conversationId}
          otherUser={activeCall.otherUser}
          currentUserId={user.id}
          isVideoCall={activeCall.isVideo}
          isIncoming={activeCall.isIncoming}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </CallContext.Provider>
  );
};