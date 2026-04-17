import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CallScreenProps {
  conversationId: string;
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

// ICE servers: STUN for direct connections + TURN as relay fallback for restrictive networks (mobile carriers, corporate firewalls, symmetric NATs)
// Using Open Relay Project's free public TURN servers (https://www.metered.ca/tools/openrelay/)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

const CallScreen = ({
  conversationId,
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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const startedAtRef = useRef<Date>(new Date());
  const wasConnectedRef = useRef(false);
  const callDurationRef = useRef(0);

  const channelName = `call-${conversationId}`;

  // Track latest duration in ref for cleanup
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Track if call was ever connected
  useEffect(() => {
    if (callState === "connected") wasConnectedRef.current = true;
  }, [callState]);

  const logCall = useCallback(async (status: "completed" | "missed" | "declined" | "cancelled") => {
    try {
      // Only the caller logs the call to avoid duplicates
      if (isIncoming) return;
      await supabase.from("call_logs").insert({
        conversation_id: conversationId,
        caller_id: currentUserId,
        receiver_id: otherUser.user_id,
        call_type: isVideoCall ? "video" : "voice",
        status,
        duration_seconds: callDurationRef.current,
        started_at: startedAtRef.current.toISOString(),
        ended_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to log call:", err);
    }
  }, [conversationId, currentUserId, otherUser.user_id, isVideoCall, isIncoming]);

  const cleanup = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;

    // Determine final status
    const status: "completed" | "missed" | "cancelled" =
      wasConnectedRef.current ? "completed" : "cancelled";
    logCall(status);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: { type: "end", from: currentUserId },
      });
      setTimeout(() => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
      }, 500);
    }
    setCallState("ended");
    setTimeout(onEnd, 1000);
  }, [currentUserId, onEnd, logCall]);

  // Start call duration timer
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Main WebRTC + signaling logic
  useEffect(() => {
    let mounted = true;

    const setupCall = async () => {
      try {
        // Get media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideoCall,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          if (mounted) setCallState("connected");
        };

        // Set up signaling channel
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: "broadcast",
              event: "call-signal",
              payload: {
                type: "ice-candidate",
                candidate: event.candidate.toJSON(),
                from: currentUserId,
              },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            if (mounted) cleanup();
          }
        };

        // Listen for signals
        channel.on("broadcast", { event: "call-signal" }, async ({ payload }) => {
          if (!mounted || !pcRef.current) return;

          if (payload.type === "offer" && payload.from !== currentUserId) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            // Flush queued ICE candidates
            for (const c of iceCandidateQueue.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            }
            iceCandidateQueue.current = [];
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "call-signal",
              payload: { type: "answer", sdp: answer, from: currentUserId },
            });
          }

          if (payload.type === "answer" && payload.from !== currentUserId) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            // Flush queued ICE candidates
            for (const c of iceCandidateQueue.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            }
            iceCandidateQueue.current = [];
          }

          if (payload.type === "ice-candidate" && payload.from !== currentUserId) {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              iceCandidateQueue.current.push(payload.candidate);
            }
          }

          if (payload.type === "accept" && payload.from !== currentUserId) {
            // Other user accepted, create offer
            const offer = await pcRef.current!.createOffer();
            await pcRef.current!.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "call-signal",
              payload: { type: "offer", sdp: offer, from: currentUserId },
            });
            if (mounted) setCallState("connecting");
          }

          if (payload.type === "end" && payload.from !== currentUserId) {
            if (mounted) cleanup();
          }
        });

        await channel.subscribe();

        // If outgoing call, send ring signal and then offer
        if (!isIncoming) {
          channel.send({
            type: "broadcast",
            event: "call-signal",
            payload: {
              type: "ring",
              from: currentUserId,
              isVideo: isVideoCall,
              callerName: "", // filled by receiver from profile
            },
          });

          // Auto-create offer for simplicity (peer will answer when they accept)
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: "broadcast",
            event: "call-signal",
            payload: { type: "offer", sdp: offer, from: currentUserId },
          });
          if (mounted) setCallState("ringing");
        }
      } catch (err) {
        console.error("Call setup failed:", err);
        if (mounted) cleanup();
      }
    };

    setupCall();

    return () => {
      mounted = false;
    };
  }, []);

  // Accept incoming call
  const acceptCall = async () => {
    setCallState("connecting");
    channelRef.current?.send({
      type: "broadcast",
      event: "call-signal",
      payload: { type: "accept", from: currentUserId },
    });
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
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Video areas */}
      {isVideoCall ? (
        <div className="relative flex-1 bg-black">
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          {/* Local video (small overlay) */}
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
          {/* Status overlay */}
          {callState !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <img
                src={otherUser.avatar_url || "https://i.pravatar.cc/150"}
                alt=""
                className="h-24 w-24 rounded-full object-cover mb-4"
              />
              <h2 className="text-xl font-bold text-white">
                {otherUser.display_name || "User"}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {callState === "ringing" && (isIncoming ? "Incoming video call..." : "Ringing...")}
                {callState === "connecting" && "Connecting..."}
                {callState === "ended" && "Call ended"}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Audio-only call UI */
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative">
            <img
              src={otherUser.avatar_url || "https://i.pravatar.cc/150"}
              alt=""
              className="h-28 w-28 rounded-full object-cover"
            />
            {callState === "ringing" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            )}
          </div>
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            {otherUser.display_name || "User"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {callState === "ringing" && (isIncoming ? "Incoming voice call..." : "Ringing...")}
            {callState === "connecting" && "Connecting..."}
            {callState === "connected" && formatTime(callDuration)}
            {callState === "ended" && "Call ended"}
          </p>
          {/* Hidden audio elements */}
          <audio ref={remoteVideoRef as any} autoPlay />
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 py-8 bg-background/80 backdrop-blur-sm">
        {callState === "ringing" && isIncoming ? (
          <>
            {/* Accept / Decline */}
            <button
              onClick={cleanup}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
            <button
              onClick={acceptCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-pulse"
            >
              <Phone className="h-7 w-7" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                isMuted ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                  !isVideoEnabled ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"
                }`}
              >
                {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
            )}

            <button
              onClick={cleanup}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg"
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
