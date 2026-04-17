import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneOff, Video } from "lucide-react";

export interface IncomingCallInfo {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  isVideo: boolean;
}

interface PendingAcceptedCall {
  conversationId: string;
  otherUserId: string;
  isVideo: boolean;
  isIncoming: boolean;
}

interface IncomingCallContextType {
  pendingCall: PendingAcceptedCall | null;
  consumePendingCall: () => PendingAcceptedCall | null;
  /** Caller-side: notify a receiver across all their devices */
  ringUser: (receiverId: string, conversationId: string, isVideo: boolean, callerName: string, callerAvatar: string | null) => void;
}

const IncomingCallContext = createContext<IncomingCallContextType>({
  pendingCall: null,
  consumePendingCall: () => null,
  ringUser: () => {},
});

export const useIncomingCall = () => useContext(IncomingCallContext);

const ringtoneDataUri =
  // Short data-URI beep loop fallback (silent if blocked); browsers will play this when allowed
  "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQBvAAAA";

export const IncomingCallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);
  const [pendingCall, setPendingCall] = useState<PendingAcceptedCall | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to a per-user channel so any device receives ring events
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-call-${user.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "incoming-call" }, ({ payload }) => {
        if (!payload || payload.receiverId !== user.id) return;
        setIncoming({
          conversationId: payload.conversationId,
          callerId: payload.callerId,
          callerName: payload.callerName || "User",
          callerAvatar: payload.callerAvatar || null,
          isVideo: !!payload.isVideo,
        });
      })
      .on("broadcast", { event: "cancel-call" }, ({ payload }) => {
        if (!payload || payload.receiverId !== user.id) return;
        setIncoming(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Play ringtone while incoming
  useEffect(() => {
    if (!incoming) {
      audioRef.current?.pause();
      return;
    }
    const audio = new Audio(ringtoneDataUri);
    audio.loop = true;
    audio.volume = 1;
    audioRef.current = audio;
    audio.play().catch(() => {/* autoplay blocked */});
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [incoming]);

  const ringUser = useCallback(
    (receiverId: string, conversationId: string, isVideo: boolean, callerName: string, callerAvatar: string | null) => {
      if (!user) return;
      const ch = supabase.channel(`user-call-${receiverId}`, { config: { broadcast: { self: false } } });
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({
            type: "broadcast",
            event: "incoming-call",
            payload: {
              receiverId,
              callerId: user.id,
              conversationId,
              isVideo,
              callerName,
              callerAvatar,
            },
          });
          setTimeout(() => supabase.removeChannel(ch), 800);
        }
      });
    },
    [user?.id]
  );

  const accept = () => {
    if (!incoming) return;
    setPendingCall({
      conversationId: incoming.conversationId,
      otherUserId: incoming.callerId,
      isVideo: incoming.isVideo,
      isIncoming: true,
    });
    setIncoming(null);
    navigate("/messages");
  };

  const decline = () => {
    if (!incoming || !user) return;
    // Tell caller's per-user channel and the call channel that we ended
    const ch = supabase.channel(`call-${incoming.conversationId}`, { config: { broadcast: { self: false } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "call-signal", payload: { type: "end", from: user.id } });
        setTimeout(() => supabase.removeChannel(ch), 500);
      }
    });
    setIncoming(null);
  };

  const consumePendingCall = useCallback(() => {
    const c = pendingCall;
    setPendingCall(null);
    return c;
  }, [pendingCall]);

  return (
    <IncomingCallContext.Provider value={{ pendingCall, consumePendingCall, ringUser }}>
      {children}
      {incoming && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <img
                  src={incoming.callerAvatar || "https://i.pravatar.cc/150"}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/30"
                />
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Incoming {incoming.isVideo ? "video" : "voice"} call
              </p>
              <h3 className="mt-1 text-2xl font-bold text-foreground">{incoming.callerName}</h3>

              <div className="mt-8 flex w-full items-center justify-around">
                <button
                  onClick={decline}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-transform hover:scale-105"
                  aria-label="Decline"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
                <button
                  onClick={accept}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-pulse transition-transform hover:scale-105"
                  aria-label="Accept"
                >
                  {incoming.isVideo ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </IncomingCallContext.Provider>
  );
};
