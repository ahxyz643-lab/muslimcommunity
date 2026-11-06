import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";

interface CallScreenProps {
  conversationId: string;
  callId?: string;
  otherUser: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  currentUserId: string;
  isVideoCall: boolean;
  isIncoming?: boolean;
  onEnd: () => void;
}

type CallState = "ringing" | "connecting" | "connected" | "ended";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const CallScreen = ({
  conversationId,
  callId: initialCallId,
  otherUser,
  currentUserId,
  isVideoCall,
  isIncoming = false,
  onEnd,
}: CallScreenProps) => {
  const [callState, setCallState] = useState<CallState>(isIncoming ? "ringing" : "connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [callDuration, setCallDuration] = useState(0);

  const [activeCallId, setActiveCallId] = useState<string>(initialCallId || conversationId);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);
  const unsubCallRef = useRef<(() => void) | null>(null);
  const unsubCandRef = useRef<(() => void) | null>(null);

  // Ringtone via WebAudio
  const ringAudioRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);
  const startRingtone = useCallback((incoming: boolean) => {
    if (ringAudioRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);

      let stopped = false;
      const playBeep = (freq: number, dur: number, when: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.2, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(g).connect(master);
        osc.start(when);
        osc.stop(when + dur + 0.05);
      };

      const schedule = () => {
        if (stopped) return;
        const t = ctx.currentTime;
        if (incoming) {
          playBeep(440, 0.4, t);
          playBeep(480, 0.4, t + 0.5);
          playBeep(440, 0.4, t + 1.2);
          playBeep(480, 0.4, t + 1.7);
        } else {
          playBeep(420, 1.0, t);
          playBeep(420, 1.0, t + 2.0);
        }
        master.gain.setValueAtTime(1, t);
      };
      schedule();
      const interval = setInterval(schedule, incoming ? 3000 : 4000);

      ringAudioRef.current = {
        ctx,
        stop: () => {
          stopped = true;
          clearInterval(interval);
          try { master.disconnect(); } catch {}
          try { ctx.close(); } catch {}
        },
      };
    } catch (e) {
      console.warn("Ringtone unavailable", e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    ringAudioRef.current?.stop();
    ringAudioRef.current = null;
  }, []);

  useEffect(() => {
    if (callState === "ringing") {
      startRingtone(isIncoming);
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callState, isIncoming, startRingtone, stopRingtone]);

  const cleanup = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    stopRingtone();

    if (unsubCallRef.current) unsubCallRef.current();
    if (unsubCandRef.current) unsubCandRef.current();

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;

    try {
      if (activeCallId) {
        await updateDoc(doc(db, "calls", activeCallId), {
          status: "ended",
        });
      }
    } catch {
      // ignore write error on call end
    }

    setCallState("ended");
    setTimeout(onEnd, 800);
  }, [activeCallId, onEnd, stopRingtone]);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Main WebRTC flow
  useEffect(() => {
    let isCancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideoCall,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          if (!isCancelled) setCallState("connected");
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            if (!isCancelled) cleanup();
          }
        };

        const callDocRef = doc(db, "calls", activeCallId);

        if (!isIncoming) {
          // Caller Flow
          pc.onicecandidate = async (event) => {
            if (event.candidate) {
              const col = collection(db, "calls", activeCallId, "callerCandidates");
              await addDoc(col, {
                candidate: JSON.stringify(event.candidate.toJSON()),
                from: currentUserId,
                created_at: new Date().toISOString(),
              }).catch(() => {});
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await setDoc(callDocRef, {
            id: activeCallId,
            conversation_id: conversationId,
            caller_id: currentUserId,
            caller_name: otherUser.display_name || "Caller",
            caller_avatar: otherUser.avatar_url || "",
            receiver_id: otherUser.user_id,
            is_video: isVideoCall,
            status: "ringing",
            offer: JSON.stringify(offer),
            created_at: new Date().toISOString(),
          });

          if (!isCancelled) setCallState("ringing");

          // Listen for answer from callee
          unsubCallRef.current = onSnapshot(callDocRef, async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.status === "ended" || data.status === "declined") {
              if (!isCancelled) cleanup();
            } else if (data.status === "connected" && data.answer && !pc.currentRemoteDescription) {
              const rtcDesc = new RTCSessionDescription(JSON.parse(data.answer));
              await pc.setRemoteDescription(rtcDesc);
              if (!isCancelled) setCallState("connected");
            }
          });

          // Listen for callee's ICE candidates
          const calleeCandCol = collection(db, "calls", activeCallId, "calleeCandidates");
          unsubCandRef.current = onSnapshot(calleeCandCol, (snap) => {
            snap.docChanges().forEach(async (change) => {
              if (change.type === "added") {
                const candData = JSON.parse(change.doc.data().candidate);
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candData));
                } catch (e) {
                  console.warn("Failed to add callee candidate", e);
                }
              }
            });
          });
        } else {
          // Callee Flow (Incoming Call)
          // Wait for user to press Accept or Listen for caller's status
          unsubCallRef.current = onSnapshot(callDocRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.status === "ended") {
              if (!isCancelled) cleanup();
            }
          });
        }
      } catch (err) {
        console.error("Call initialization failed:", err);
        if (!isCancelled) cleanup();
      }
    };

    setup();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Callee accepts the call
  const acceptCall = async () => {
    if (!pcRef.current) return;
    setCallState("connecting");

    const pc = pcRef.current;
    const callDocRef = doc(db, "calls", activeCallId);

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const col = collection(db, "calls", activeCallId, "calleeCandidates");
        await addDoc(col, {
          candidate: JSON.stringify(event.candidate.toJSON()),
          from: currentUserId,
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }
    };

    try {
      const snap = await getDoc(callDocRef);
      if (!snap.exists()) {
        cleanup();
        return;
      }
      const data = snap.data();
      if (!data.offer) {
        cleanup();
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callDocRef, {
        answer: JSON.stringify(answer),
        status: "connected",
      });

      // Listen for caller candidates
      const callerCandCol = collection(db, "calls", activeCallId, "callerCandidates");
      unsubCandRef.current = onSnapshot(callerCandCol, (candSnap) => {
        candSnap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const candData = JSON.parse(change.doc.data().candidate);
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candData));
            } catch (e) {
              console.warn("Failed to add caller candidate", e);
            }
          }
        });
      });

      setCallState("connected");
    } catch (e) {
      console.error("Error answering call:", e);
      cleanup();
    }
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {isVideoCall ? (
        <div className="relative flex-1 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute right-4 top-4 h-36 w-24 overflow-hidden rounded-2xl border-2 border-background shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>
          {callState !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <img
                src={otherUser.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                alt=""
                className="h-24 w-24 rounded-full object-cover mb-4 ring-4 ring-primary"
              />
              <h2 className="text-xl font-bold text-white">
                {otherUser.display_name || "Community Member"}
              </h2>
              <p className="mt-2 text-sm text-white/80">
                {callState === "ringing" && (isIncoming ? "Incoming video call..." : "Calling...")}
                {callState === "connecting" && "Establishing connection..."}
                {callState === "ended" && "Call ended"}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <img
              src={otherUser.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
              alt=""
              className="h-28 w-28 rounded-full object-cover ring-4 ring-primary/40 shadow-glow"
            />
            {callState === "ringing" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {otherUser.display_name || "Community Member"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {callState === "ringing" && (isIncoming ? "Incoming voice call..." : "Ringing...")}
            {callState === "connecting" && "Connecting voice session..."}
            {callState === "connected" && (
              <span className="font-mono text-emerald-brand font-semibold">{formatTime(callDuration)}</span>
            )}
            {callState === "ended" && "Call ended"}
          </p>
          <audio ref={remoteVideoRef as any} autoPlay />
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
        </div>
      )}

      {/* Controls */}
      <div
        className="flex items-center justify-center gap-6 bg-background/90 backdrop-blur-md pt-6 pb-10 border-t border-border"
      >
        {callState === "ringing" && isIncoming ? (
          <>
            <button
              onClick={cleanup}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-transform active:scale-95"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
            <button
              onClick={acceptCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-pulse transition-transform active:scale-95"
            >
              <Phone className="h-7 w-7" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                isMuted ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                  !isVideoEnabled ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
            )}

            <button
              onClick={cleanup}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-transform active:scale-95 hover:opacity-90"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallScreen;
