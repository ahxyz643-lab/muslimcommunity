import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  ArrowLeft,
  Send,
  Loader2,
  Check,
  CheckCheck,
  ImagePlus,
  X,
  Mic,
  Square,
  Trash2,
  Phone,
  PhoneOff,
  Video,
  Sparkles,
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CallScreen from "@/components/CallScreen";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  limit,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";

interface OtherUserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_seen?: string | null;
}

interface Conversation {
  id: string;
  participant_ids: string[];
  otherUser: OtherUserProfile;
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
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
};

const OnlineDot = ({ lastSeen, size = "sm" }: { lastSeen?: string | null; size?: "sm" | "md" }) => {
  const online = isOnline(lastSeen);
  const px = size === "md" ? "h-3.5 w-3.5 border-2" : "h-2.5 w-2.5 border-[1.5px]";
  return (
    <span
      className={`absolute bottom-0 right-0 ${px} rounded-full border-background ${
        online ? "bg-green-500 shadow-sm" : "bg-muted-foreground/30"
      }`}
    />
  );
};

export const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allCommunityUsers, setAllCommunityUsers] = useState<OtherUserProfile[]>([]);
  const [sending, setSending] = useState(false);

  // Attachment states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  // Calling state
  const [activeCall, setActiveCall] = useState<{ isVideo: boolean; isIncoming: boolean; callId?: string } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    conversationId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    isVideo: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Fetch conversations in real-time from Firestore
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setConvosLoading(false);
      return;
    }

    const convosCol = collection(db, "conversations");
    const q = query(convosCol, where("participant_ids", "array-contains", user.id));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const rawConvos = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as any[];

        // Extract other user IDs
        const otherIds = new Set<string>();
        rawConvos.forEach((c) => {
          (c.participant_ids || []).forEach((pid: string) => {
            if (pid !== user.id) otherIds.add(pid);
          });
        });

        // Load profiles for these users
        const profileMap = new Map<string, OtherUserProfile>();
        for (const pid of otherIds) {
          try {
            const pDoc = await getDoc(doc(db, "profiles", pid));
            if (pDoc.exists()) {
              profileMap.set(pid, { user_id: pid, ...(pDoc.data() as any) });
            } else {
              profileMap.set(pid, {
                user_id: pid,
                display_name: "Community Member",
                username: "member",
                avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${pid}`,
              });
            }
          } catch {
            // fallback
          }
        }

        const formatted: Conversation[] = rawConvos.map((c) => {
          const otherId = (c.participant_ids || []).find((pid: string) => pid !== user.id) || "unknown";
          const otherProf = profileMap.get(otherId) || {
            user_id: otherId,
            display_name: "Community Member",
            username: "member",
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${otherId}`,
          };
          return {
            id: c.id,
            participant_ids: c.participant_ids || [],
            otherUser: otherProf,
            lastMessage: c.last_message || "",
            lastMessageAt: c.last_message_at || c.created_at || "",
            unread: 0,
          };
        });

        formatted.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });

        setConversations(formatted);
        setConvosLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "conversations");
        setConvosLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  // 2. Fetch community members for quick chat / new chat
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "profiles"), limit(30));
        const snap = await getDocs(q);
        const users = snap.docs
          .map((d) => ({ user_id: d.id, ...d.data() } as OtherUserProfile))
          .filter((p) => p.user_id !== user.id);
        setAllCommunityUsers(users);
      } catch (err) {
        console.warn("Could not load community members:", err);
      }
    };
    fetchUsers();
  }, [user?.id]);

  // 3. Start or Open conversation with a user
  const openChatWithUser = useCallback(
    async (targetUserId: string) => {
      if (!user || !targetUserId || targetUserId === user.id) return;

      // 1. Check if conversation already exists in state
      const existing = conversations.find((c) =>
        c.participant_ids.includes(targetUserId)
      );
      if (existing) {
        setActiveConvo(existing);
        setShowNewChatModal(false);
        return;
      }

      // 2. Load target user profile
      let targetProfile: OtherUserProfile = {
        user_id: targetUserId,
        display_name: "Community Member",
        username: "member",
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${targetUserId}`,
      };

      try {
        const pSnap = await getDoc(doc(db, "profiles", targetUserId));
        if (pSnap.exists()) {
          targetProfile = { user_id: targetUserId, ...(pSnap.data() as any) };
        }
      } catch (e) {
        console.warn("Profile fetch fallback:", e);
      }

      // Generate deterministic conversation ID for 1-on-1 chats to prevent duplicates
      const convoId = [user.id, targetUserId].sort().join("_");
      const convoRef = doc(db, "conversations", convoId);

      try {
        await setDoc(
          convoRef,
          {
            id: convoId,
            participant_ids: [user.id, targetUserId],
            created_at: new Date().toISOString(),
          },
          { merge: true }
        );

        const newConvoObj: Conversation = {
          id: convoId,
          participant_ids: [user.id, targetUserId],
          otherUser: targetProfile,
          lastMessage: "",
          unread: 0,
        };

        setActiveConvo(newConvoObj);
        setShowNewChatModal(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `conversations/${convoId}`);
      }
    },
    [user, conversations]
  );

  // 4. Check URL parameter ?user=XYZ to directly open chat window from any profile
  useEffect(() => {
    const targetUserId = searchParams.get("user") || searchParams.get("new");
    if (targetUserId && user && (!activeConvo || activeConvo.otherUser.user_id !== targetUserId)) {
      openChatWithUser(targetUserId);
    }
  }, [searchParams, user, openChatWithUser, activeConvo]);

  // 5. Real-time messages for active conversation
  useEffect(() => {
    if (!activeConvo || !user) {
      setMessages([]);
      return;
    }

    const messagesCol = collection(db, "conversations", activeConvo.id, "messages");
    const q = query(messagesCol, orderBy("created_at", "asc"), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Message[];
        setMessages(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `conversations/${activeConvo.id}/messages`);
      }
    );

    return () => unsubscribe();
  }, [activeConvo?.id, user?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 6. Listen for incoming calls across Firestore
  useEffect(() => {
    if (!user) return;
    const callsCol = collection(db, "calls");
    const q = query(
      callsCol,
      where("receiver_id", "==", user.id),
      where("status", "==", "ringing")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeRing = snapshot.docs[0];
      if (activeRing && !activeCall) {
        const callData = activeRing.data();
        setIncomingCall({
          callId: activeRing.id,
          conversationId: callData.conversation_id,
          callerId: callData.caller_id,
          callerName: callData.caller_name || "Community Member",
          callerAvatar: callData.caller_avatar,
          isVideo: !!callData.is_video,
        });
      } else if (!activeRing && incomingCall) {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [user?.id, activeCall, incomingCall]);

  // 7. Send message
  const sendMessage = async () => {
    if (!user || !activeConvo || sending) return;
    if (!newMessage.trim() && !imagePreview && !voiceBlob) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const messagesCol = collection(db, "conversations", activeConvo.id, "messages");
    const convoRef = doc(db, "conversations", activeConvo.id);
    const nowIso = new Date().toISOString();

    try {
      await addDoc(messagesCol, {
        conversation_id: activeConvo.id,
        sender_id: user.id,
        content: content || "",
        image_url: imagePreview || null,
        voice_url: null,
        read_at: null,
        created_at: nowIso,
      });

      await updateDoc(convoRef, {
        last_message: content || (imagePreview ? "📷 Photo" : "Voice note"),
        last_message_at: nowIso,
      });

      setImageFile(null);
      setImagePreview(null);
      setVoiceBlob(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${activeConvo.id}/messages`);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!activeConvo) return;
    try {
      await deleteDoc(doc(db, "conversations", activeConvo.id, "messages", msgId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `conversations/${activeConvo.id}/messages/${msgId}`);
    }
  };

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
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
      console.warn("Mic access denied or unavailable", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Accept incoming call
  const acceptIncomingCall = () => {
    if (!incomingCall) return;
    setActiveCall({
      isVideo: incomingCall.isVideo,
      isIncoming: true,
      callId: incomingCall.callId,
    });
    setIncomingCall(null);
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, "calls", incomingCall.callId), {
        status: "declined",
      });
    } catch {}
    setIncomingCall(null);
  };

  // Active call view
  if (activeCall && (activeConvo || incomingCall)) {
    const other = activeConvo ? activeConvo.otherUser : {
      user_id: incomingCall!.callerId,
      display_name: incomingCall!.callerName,
      username: "user",
      avatar_url: incomingCall!.callerAvatar || null,
    };
    const convoId = activeConvo ? activeConvo.id : incomingCall!.conversationId;

    return (
      <CallScreen
        conversationId={convoId}
        callId={activeCall.callId}
        otherUser={other}
        currentUserId={user!.id}
        isVideoCall={activeCall.isVideo}
        isIncoming={activeCall.isIncoming}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  // Incoming call overlay dialog
  const incomingOverlay = incomingCall && (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6">
      <div className="animate-pulse mb-6">
        <img
          src={incomingCall.callerAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
          alt=""
          className="h-24 w-24 rounded-full object-cover ring-4 ring-primary ring-offset-4 ring-offset-background"
        />
      </div>
      <h2 className="text-xl font-bold text-foreground">
        {incomingCall.callerName}
      </h2>
      <p className="mt-2 text-sm text-emerald-brand font-medium">
        Incoming {incomingCall.isVideo ? "Video" : "Voice"} Call...
      </p>
      <div className="mt-8 flex gap-8">
        <button
          onClick={declineIncomingCall}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-xl transition-transform active:scale-95"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
        <button
          onClick={acceptIncomingCall}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-xl animate-pulse transition-transform active:scale-95"
        >
          <Phone className="h-7 w-7" />
        </button>
      </div>
    </div>
  );

  // Active Chat Screen
  if (activeConvo) {
    return (
      <div className="flex min-h-screen flex-col pb-20">
        {incomingOverlay}

        {/* Chat Header */}
        <div className="flex items-center gap-3 border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3 sticky top-0 z-30">
          <button
            onClick={() => {
              setActiveConvo(null);
              setImagePreview(null);
              setImageFile(null);
              setVoiceBlob(null);
            }}
            className="text-muted-foreground hover:text-foreground p-1 -ml-1 rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className="relative cursor-pointer"
            onClick={() => navigate(`/user/${activeConvo.otherUser.user_id}`)}
          >
            <img
              src={activeConvo.otherUser.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
            />
            <OnlineDot lastSeen={activeConvo.otherUser.last_seen} size="sm" />
          </div>
          <div
            className="flex-1 cursor-pointer"
            onClick={() => navigate(`/user/${activeConvo.otherUser.user_id}`)}
          >
            <p className="text-sm font-semibold text-foreground leading-tight">
              {activeConvo.otherUser.display_name || "Community Member"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOnline(activeConvo.otherUser.last_seen) ? (
                <span className="text-green-500 font-medium">Active now</span>
              ) : (
                `@${activeConvo.otherUser.username || "user"}`
              )}
            </p>
          </div>

          {/* Voice and Video Call Triggers */}
          <button
            onClick={() =>
              setActiveCall({
                isVideo: false,
                isIncoming: false,
                callId: `call_${activeConvo.id}_${Date.now()}`,
              })
            }
            className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Start Voice Call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              setActiveCall({
                isVideo: true,
                isIncoming: false,
                callId: `call_${activeConvo.id}_${Date.now()}`,
              })
            }
            className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Start Video Call"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-primary mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Say As-salamu alaykum!
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Start a meaningful conversation with {activeConvo.otherUser.display_name}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`group flex items-end gap-1.5 ${
                    isMine ? "justify-end" : "justify-start"
                  }`}
                >
                  {isMine && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? "gradient-primary text-primary-foreground rounded-br-xs"
                        : "bg-card text-foreground border border-border rounded-bl-xs"
                    }`}
                  >
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Attached media"
                        className="mb-2 max-h-60 w-full rounded-xl object-cover cursor-pointer"
                        onClick={() => window.open(msg.image_url!, "_blank")}
                      />
                    )}
                    {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                    <div
                      className={`mt-1 flex items-center gap-1 text-[10px] ${
                        isMine ? "justify-end text-primary-foreground/75" : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {msg.created_at
                          ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })
                          : "just now"}
                      </span>
                      {isMine && (
                        msg.read_at ? (
                          <CheckCheck className="h-3 w-3 text-emerald-200" />
                        ) : (
                          <Check className="h-3 w-3 text-primary-foreground/70" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Attachment Preview */}
        {imagePreview && (
          <div className="border-t border-border bg-card px-4 py-2">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-20 w-20 rounded-xl object-cover ring-1 ring-border"
              />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-md"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-border bg-card/80 backdrop-blur-md px-4 py-3 sticky bottom-0">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ImagePlus className="h-5 w-5" />
            </button>

            {isRecording ? (
              <div className="flex flex-1 items-center gap-2 rounded-full bg-destructive/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-semibold text-destructive tabular-nums">
                  {Math.floor(recordingTime / 60)}:
                  {String(recordingTime % 60).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground">Recording voice note...</span>
              </div>
            ) : (
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 rounded-full bg-secondary/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}

            {!newMessage.trim() && !imagePreview && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
              </button>
            )}

            {(newMessage.trim() || imagePreview) && (
              <button
                onClick={sendMessage}
                disabled={sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-glow transition-transform active:scale-95 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filtered search list
  const filteredConvos = conversations.filter((c) =>
    (c.otherUser.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.otherUser.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCommunity = allCommunityUsers.filter((u) =>
    (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Conversations List & Quick New Chat View
  return (
    <div className="pb-24">
      {incomingOverlay}

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5 bg-card/40 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground">Direct chats & calls with the Ummah</p>
        </div>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="flex items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Prominent Search Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-secondary/60 px-3.5 py-2.5 border border-border/80 focus-within:border-primary/50 transition-all">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations or start new chat..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Message Strip - 1 Tap to start conversation */}
      {allCommunityUsers.length > 0 && !searchQuery && (
        <div className="py-2.5 border-b border-border/50">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Connect
            </span>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="text-xs text-emerald-brand hover:underline"
            >
              View all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide py-1">
            {allCommunityUsers.slice(0, 10).map((member) => (
              <button
                key={member.user_id}
                onClick={() => openChatWithUser(member.user_id)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative">
                  <img
                    src={member.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${member.user_id}`}
                    alt={member.display_name || "User"}
                    className="h-13 w-13 rounded-full object-cover ring-2 ring-primary/40 group-hover:ring-primary transition-all group-hover:scale-105"
                  />
                  <OnlineDot lastSeen={member.last_seen} size="sm" />
                </div>
                <span className="text-[11px] font-medium text-foreground max-w-[60px] truncate">
                  {member.display_name?.split(" ")[0] || "User"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results mode when typing in search bar */}
      {searchQuery && (
        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Community Search Results
          </p>
          {filteredCommunity.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching profiles found
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {filteredCommunity.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => {
                    openChatWithUser(u.user_id);
                    setSearchQuery("");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-secondary/60 text-left transition-colors"
                >
                  <img
                    src={u.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.user_id}`}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {u.display_name || "Community Member"}
                    </p>
                    <p className="text-xs text-muted-foreground">@{u.username || "member"}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-brand bg-primary/10 px-2.5 py-1 rounded-full">
                    Chat
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Conversation List */}
      {!searchQuery && (
        <div>
          {convosLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4 text-primary shadow-sm">
                <Plus className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">No conversations yet</h2>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Connect and exchange reminders, career advice, and friendship with Muslims worldwide.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-5 rounded-xl gradient-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition-transform active:scale-95"
              >
                Start Your First Chat
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConvos.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setActiveConvo(convo)}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 hover:bg-secondary/40 transition-colors text-left"
                >
                  <div className="relative">
                    <img
                      src={convo.otherUser.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                    />
                    <OnlineDot lastSeen={convo.otherUser.last_seen} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {convo.otherUser.display_name || "Community Member"}
                      </p>
                      {convo.lastMessageAt && (
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {convo.lastMessage || "Click to start chatting..."}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Chat Modal / Sheet */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">Start New Chat</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 border border-border">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search by name or handle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {filteredCommunity.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  No members found
                </p>
              ) : (
                filteredCommunity.map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => openChatWithUser(m.user_id)}
                    className="flex w-full items-center gap-3 px-3 py-3 hover:bg-secondary/60 rounded-xl transition-colors text-left"
                  >
                    <div className="relative">
                      <img
                        src={m.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.user_id}`}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover ring-1 ring-border"
                      />
                      <OnlineDot lastSeen={m.last_seen} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {m.display_name || "Community Member"}
                      </p>
                      <p className="text-xs text-muted-foreground">@{m.username || "member"}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-brand bg-primary/10 px-3 py-1 rounded-full">
                      Message
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
