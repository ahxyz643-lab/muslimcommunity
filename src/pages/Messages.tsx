import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Edit, ArrowLeft, Send, Loader2, Check, CheckCheck, ImagePlus, X, Mic, Square, Trash2, Phone, Video } from "lucide-react";
import CallScreen from "@/components/CallScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  otherUser: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    last_seen?: string | null;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  image_url: string | null;
  voice_url: string | null;
}

const isOnline = (lastSeen: string | null | undefined) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
};

const OnlineDot = ({ lastSeen, size = "sm" }: { lastSeen?: string | null; size?: "sm" | "md" }) => {
  const online = isOnline(lastSeen);
  const px = size === "md" ? "h-3.5 w-3.5 border-2" : "h-2.5 w-2.5 border-[1.5px]";
  return (
    <span className={`absolute bottom-0 right-0 ${px} rounded-full border-background ${online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
  );
};

const VoicePlayer = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (audioRef.current) setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={toggle} className="shrink-0">
        {playing ? (
          <Square className="h-4 w-4 fill-current" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><polygon points="5,3 19,12 5,21" /></svg>
        )}
      </button>
      <div className="flex-1 h-1.5 bg-current/20 rounded-full overflow-hidden">
        <div className="h-full bg-current rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] opacity-70 tabular-nums">
        {duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "0:00"}
      </span>
    </div>
  );
};

const Messages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calling state
  const [activeCall, setActiveCall] = useState<{ isVideo: boolean; isIncoming: boolean } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ conversationId: string; callerId: string; isVideo: boolean } | null>(null);

  // Update last_seen periodically
  useEffect(() => {
    if (!user) return;
    const update = () => supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id).then();
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Fetch conversations
  const { data: conversations = [], isLoading: convosLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user!.id);

      if (!participants || participants.length === 0) return [];

      const convoIds = participants.map((p) => p.conversation_id);

      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convoIds)
        .neq("user_id", user!.id);

      if (!allParticipants) return [];

      const otherUserIds = [...new Set(allParticipants.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, last_seen")
        .in("user_id", otherUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const convos: Conversation[] = [];
      for (const p of allParticipants) {
        const prof = profileMap.get(p.user_id);
        if (!prof) continue;

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at, image_url, voice_url")
          .eq("conversation_id", p.conversation_id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0];
        let lastMessage = lastMsg?.content;
        if (lastMsg?.image_url) lastMessage = "📷 Photo";
        if (lastMsg?.voice_url) lastMessage = "🎤 Voice note";

        convos.push({
          id: p.conversation_id,
          otherUser: prof,
          lastMessage,
          lastMessageAt: lastMsg?.created_at,
          unread: 0,
        });
      }

      return convos.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
    },
    enabled: !!user,
  });

  // Listen for incoming calls across all conversations
  useEffect(() => {
    if (!user || conversations.length === 0) return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    conversations.forEach((convo) => {
      const ch = supabase
        .channel(`call-listen-${convo.id}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "call-signal" }, ({ payload }) => {
          if (payload.type === "ring" && payload.from !== user.id && !activeCall && !incomingCall) {
            setIncomingCall({
              conversationId: convo.id,
              callerId: payload.from,
              isVideo: payload.isVideo,
            });
          }
        })
        .subscribe();
      channels.push(ch);
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user?.id, conversations, activeCall, incomingCall]);


  const { data: fetchedMessages = [] } = useQuery({
    queryKey: ["messages", activeConvo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvo!.id)
        .order("created_at", { ascending: true });
      return (data as Message[]) || [];
    },
    enabled: !!activeConvo,
  });

  // Sync fetched messages into realtime state
  const fetchedMessagesJson = JSON.stringify(fetchedMessages);
  useEffect(() => {
    setRealtimeMessages(JSON.parse(fetchedMessagesJson));
  }, [fetchedMessagesJson]);

  // Real-time messages subscription
  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`chat-${activeConvo.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as Message;
            setRealtimeMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Message;
            setRealtimeMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setRealtimeMessages((prev) => prev.filter((m) => m.id !== deletedId));
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo?.id]);

  // Mark unread messages as read
  useEffect(() => {
    if (!activeConvo || !user || realtimeMessages.length === 0) return;
    const unreadIds = realtimeMessages
      .filter((m) => m.sender_id !== user.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then();
  }, [realtimeMessages, activeConvo?.id, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realtimeMessages]);

  // Fetch all users for new chat
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, last_seen")
        .neq("user_id", user!.id)
        .order("display_name", { ascending: true })
        .limit(50);
      return data || [];
    },
    enabled: !!user && showNewChat,
  });

  const searchResults = searchQuery.length > 0
    ? allUsers.filter((p) =>
        (p.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUsers;

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    const existing = conversations.find((c) => c.otherUser.user_id === otherUserId);
    if (existing) {
      setActiveConvo(existing);
      setShowNewChat(false);
      setSearchQuery("");
      return;
    }
    const convoId = crypto.randomUUID();
    const { error: convoErr } = await supabase.from("conversations").insert({ id: convoId });
    if (convoErr) { console.error("Failed to create conversation:", convoErr); return; }
    const { error: partErr } = await supabase.from("conversation_participants").insert([
      { conversation_id: convoId, user_id: user.id },
      { conversation_id: convoId, user_id: otherUserId },
    ]);
    if (partErr) { console.error("Failed to add participants:", partErr); return; }
    const profile = searchResults.find((p) => p.user_id === otherUserId) || allUsers.find((p) => p.user_id === otherUserId);
    setActiveConvo({
      id: convoId,
      otherUser: profile || { user_id: otherUserId, display_name: null, username: null, avatar_url: null },
      unread: 0,
    });
    setShowNewChat(false);
    setSearchQuery("");
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setVoiceBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const clearVoice = () => {
    setVoiceBlob(null);
    setRecordingTime(0);
  };

  const deleteMessage = async (msgId: string) => {
    setDeletingId(msgId);
    await supabase.from("messages").delete().eq("id", msgId);
    setRealtimeMessages((prev) => prev.filter((m) => m.id !== msgId));
    setDeletingId(null);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const sendMessage = async () => {
    if (!user || !activeConvo || sending) return;
    if (!newMessage.trim() && !imageFile && !voiceBlob) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    let uploadedImageUrl: string | null = null;
    let uploadedVoiceUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `chat/${activeConvo.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("media")
        .upload(path, imageFile, { contentType: imageFile.type });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        uploadedImageUrl = urlData.publicUrl;
      }
      clearImage();
    }

    if (voiceBlob) {
      const path = `chat/${activeConvo.id}/${crypto.randomUUID()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("media")
        .upload(path, voiceBlob, { contentType: "audio/webm" });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        uploadedVoiceUrl = urlData.publicUrl;
      }
      clearVoice();
    }

    await supabase.from("messages").insert({
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content: content || "",
      image_url: uploadedImageUrl,
      voice_url: uploadedVoiceUrl,
    });

    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Handle incoming call accept
  const acceptIncomingCall = () => {
    if (!incomingCall) return;
    const convo = conversations.find((c) => c.id === incomingCall.conversationId);
    if (convo) {
      setActiveConvo(convo);
      setActiveCall({ isVideo: incomingCall.isVideo, isIncoming: true });
    }
    setIncomingCall(null);
  };

  const declineIncomingCall = () => {
    if (!incomingCall) return;
    // Send end signal
    const ch = supabase.channel(`call-${incomingCall.conversationId}`, { config: { broadcast: { self: false } } });
    ch.subscribe().then(() => {
      ch.send({ type: "broadcast", event: "call-signal", payload: { type: "end", from: user?.id } });
      setTimeout(() => supabase.removeChannel(ch), 500);
    });
    setIncomingCall(null);
  };

  // Active call screen
  if (activeCall && activeConvo) {
    return (
      <CallScreen
        conversationId={activeConvo.id}
        otherUser={activeConvo.otherUser}
        currentUserId={user!.id}
        isVideoCall={activeCall.isVideo}
        isIncoming={activeCall.isIncoming}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  // Incoming call overlay
  const incomingCallOverlay = incomingCall && (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="animate-pulse mb-6">
        <img
          src={conversations.find((c) => c.id === incomingCall.conversationId)?.otherUser.avatar_url || "https://i.pravatar.cc/150"}
          alt=""
          className="h-24 w-24 rounded-full object-cover border-4 border-primary"
        />
      </div>
      <h2 className="text-xl font-bold text-foreground">
        {conversations.find((c) => c.id === incomingCall.conversationId)?.otherUser.display_name || "Someone"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Incoming {incomingCall.isVideo ? "video" : "voice"} call...
      </p>
      <div className="mt-8 flex gap-8">
        <button onClick={declineIncomingCall} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg">
          <PhoneOff className="h-7 w-7" />
        </button>
        <button onClick={acceptIncomingCall} className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-pulse">
          <Phone className="h-7 w-7" />
        </button>
      </div>
    </div>
  );

  // Chat view
  if (activeConvo) {
    return (
      <div className="flex min-h-screen flex-col pb-20">
        {incomingCallOverlay}
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={() => { setActiveConvo(null); setRealtimeMessages([]); clearImage(); clearVoice(); }} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="relative">
            <img src={activeConvo.otherUser.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-9 w-9 rounded-full object-cover" />
            <OnlineDot lastSeen={activeConvo.otherUser.last_seen} size="sm" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{activeConvo.otherUser.display_name || "User"}</p>
            <p className="text-xs text-muted-foreground">
              {isOnline(activeConvo.otherUser.last_seen) ? "Active now" : `@${activeConvo.otherUser.username || "user"}`}
            </p>
          </div>
          {/* Call buttons */}
          <button
            onClick={() => setActiveCall({ isVideo: false, isIncoming: false })}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActiveCall({ isVideo: true, isIncoming: false })}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {realtimeMessages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                {/* Delete button for own messages */}
                {isMine && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    disabled={deletingId === msg.id}
                    className="mr-1 self-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card text-foreground border border-border rounded-bl-md"
                }`}>
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="Shared photo"
                      className="mb-2 max-h-60 w-full rounded-xl object-cover cursor-pointer"
                      onClick={() => window.open(msg.image_url!, "_blank")}
                    />
                  )}
                  {msg.voice_url && <VoicePlayer url={msg.voice_url} />}
                  {msg.content && <p>{msg.content}</p>}
                  <div className={`mt-1 flex items-center gap-1 ${isMine ? "justify-end" : ""}`}>
                    <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })}
                    </span>
                    {isMine && (
                      msg.read_at
                        ? <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                        : <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="border-t border-border px-4 py-2">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
              <button onClick={clearImage} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Voice preview */}
        {voiceBlob && !isRecording && (
          <div className="border-t border-border px-4 py-2">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Voice note ready</span>
              <button onClick={clearVoice} className="ml-auto text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ImagePlus className="h-5 w-5" />
            </button>

            {isRecording ? (
              <div className="flex flex-1 items-center gap-2 rounded-full bg-destructive/10 px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive font-medium tabular-nums">
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                </span>
                <span className="text-sm text-muted-foreground">Recording...</span>
              </div>
            ) : (
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            )}

            {/* Mic / Stop button */}
            {!newMessage.trim() && !imageFile && !voiceBlob ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isRecording ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
              </button>
            ) : null}

            {/* Send button */}
            {(newMessage.trim() || imageFile || voiceBlob) && (
              <button
                onClick={sendMessage}
                disabled={sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 shadow-glow"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // New chat search
  if (showNewChat) {
    return (
      <div className="pb-20">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={() => { setShowNewChat(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-foreground">New Message</h1>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
        </div>
        <div className="divide-y divide-border">
          {searchResults.map((p) => (
            <button key={p.user_id} onClick={() => startConversation(p.user_id)} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
              <div className="relative">
                <img src={p.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-11 w-11 rounded-full object-cover" />
                <OnlineDot lastSeen={p.last_seen} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{p.display_name || "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {isOnline(p.last_seen) ? "Active now" : `@${p.username || "user"}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="pb-20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
        <button onClick={() => setShowNewChat(true)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Edit className="h-5 w-5" />
        </button>
      </div>

      {convosLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
            <Edit className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No messages yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start a conversation with someone from the community</p>
          <button onClick={() => setShowNewChat(true)} className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
            New Message
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((convo) => (
            <button key={convo.id} onClick={() => setActiveConvo(convo)} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors">
              <div className="relative">
                <img src={convo.otherUser.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-12 w-12 rounded-full object-cover" />
                <OnlineDot lastSeen={convo.otherUser.last_seen} size="md" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{convo.otherUser.display_name || "User"}</p>
                  {convo.lastMessageAt && (
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: false })}</span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{convo.lastMessage || "Start chatting..."}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
