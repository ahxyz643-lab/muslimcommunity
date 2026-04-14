import { useState, useEffect, useRef } from "react";
import { Search, Edit, ArrowLeft, Send, Loader2 } from "lucide-react";
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
}

const Messages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", otherUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const convos: Conversation[] = [];
      for (const p of allParticipants) {
        const prof = profileMap.get(p.user_id);
        if (!prof) continue;

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", p.conversation_id)
          .order("created_at", { ascending: false })
          .limit(1);

        convos.push({
          id: p.conversation_id,
          otherUser: prof,
          lastMessage: msgs?.[0]?.content,
          lastMessageAt: msgs?.[0]?.created_at,
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

  // Fetch messages for active conversation
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
  useEffect(() => {
    if (fetchedMessages.length > 0 || realtimeMessages.length > 0) {
      setRealtimeMessages((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fetchedMessages)) return prev;
        return fetchedMessages;
      });
    }
  }, [fetchedMessages.length, activeConvo?.id]);

  // Real-time messages subscription
  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`chat-${activeConvo.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setRealtimeMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [realtimeMessages]);

  // Fetch all users for new chat (filter client-side by search)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
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

    // Generate ID client-side so we can use it immediately
    const convoId = crypto.randomUUID();

    // Insert conversation without .select() to avoid SELECT RLS check before participants exist
    const { error: convoErr } = await supabase.from("conversations").insert({ id: convoId });
    if (convoErr) { console.error("Failed to create conversation:", convoErr); return; }

    // Add both participants
    const { error: partErr } = await supabase.from("conversation_participants").insert([
      { conversation_id: convoId, user_id: user.id },
      { conversation_id: convoId, user_id: otherUserId },
    ]);
    if (partErr) { console.error("Failed to add participants:", partErr); return; }

    const profile = searchResults.find((p) => p.user_id === otherUserId);
    setActiveConvo({
      id: convoId,
      otherUser: profile || { user_id: otherUserId, display_name: null, username: null, avatar_url: null },
      unread: 0,
    });
    setShowNewChat(false);
    setSearchQuery("");
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const sendMessage = async () => {
    if (!user || !activeConvo || !newMessage.trim() || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content,
    });

    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  // Chat view
  if (activeConvo) {
    return (
      <div className="flex min-h-screen flex-col pb-20">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={() => { setActiveConvo(null); setRealtimeMessages([]); }} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <img src={activeConvo.otherUser.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-9 w-9 rounded-full object-cover" />
          <div>
            <p className="text-sm font-semibold text-foreground">{activeConvo.otherUser.display_name || "User"}</p>
            <p className="text-xs text-muted-foreground">@{activeConvo.otherUser.username || "user"}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {realtimeMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender_id === user?.id
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card text-foreground border border-border rounded-bl-md"
              }`}>
                <p>{msg.content}</p>
                <p className={`mt-1 text-[10px] ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 shadow-glow"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
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
              <img src={p.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-11 w-11 rounded-full object-cover" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{p.display_name || "User"}</p>
                <p className="text-xs text-muted-foreground">@{p.username || "user"}</p>
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
              <img src={convo.otherUser.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-12 w-12 rounded-full object-cover" />
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
