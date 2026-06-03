import { useState, useEffect } from "react";
import { X, Send, Loader2, Trash2, Reply, CornerDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    verified: boolean;
  };
  replies?: Comment[];
}

type Target = "post" | "reel";
const CommentsSheet = ({ postId, reelId, type = "post", onClose, onCountChange }: { postId?: string; reelId?: string; type?: Target; onClose: () => void; onCountChange?: (delta: number) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const targetId = type === "reel" ? reelId : postId;
  const tableName = type === "reel" ? "reel_comments" : "comments";
  const fkColumn = type === "reel" ? "reel_id" : "post_id";
  const supportsReplies = type === "post";

  const fetchComments = async () => {
    if (!targetId) { setLoading(false); return; }
    const { data } = await supabase
      .from(tableName as any)
      .select("*")
      .eq(fkColumn, targetId)
      .order("created_at", { ascending: true });

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, verified")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    const allComments: Comment[] = data.map((c: any) => ({ ...c, parent_id: c.parent_id ?? null, profile: profileMap.get(c.user_id), replies: [] }));

    // Build tree: separate top-level and replies
    const topLevel: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    allComments.forEach((c) => {
      if (!c.parent_id) {
        topLevel.push(c);
      } else {
        const arr = replyMap.get(c.parent_id) || [];
        arr.push(c);
        replyMap.set(c.parent_id, arr);
      }
    });

    topLevel.forEach((c) => {
      c.replies = replyMap.get(c.id) || [];
    });

    setComments(topLevel);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [targetId, type]);

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  const handleSend = async () => {
    if (!user || !newComment.trim() || !targetId) return;
    setSending(true);
    const payload: any = {
      [fkColumn]: targetId,
      user_id: user.id,
      content: newComment.trim(),
    };
    if (supportsReplies) payload.parent_id = replyTo?.id ?? null;
    const { error } = await supabase.from(tableName as any).insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
      setReplyTo(null);
      onCountChange?.(1);
      fetchComments();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from(tableName as any).delete().eq("id", id);
    onCountChange?.(-1);
    fetchComments();
  };

  const CommentItem = ({ c, isReply = false }: { c: Comment; isReply?: boolean }) => (
    <div className={`flex gap-2.5 ${isReply ? "ml-10" : ""}`}>
      {isReply && <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />}
      <img
        src={c.profile?.avatar_url || "https://i.pravatar.cc/150?u=" + c.user_id}
        alt=""
        className={`${isReply ? "h-6 w-6" : "h-8 w-8"} rounded-full object-cover flex-shrink-0`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">{c.profile?.display_name || "User"}</span>
          {c.profile?.verified && (
            <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(c.created_at), { addSuffix: false })}
          </span>
        </div>
        <p className="text-sm text-foreground mt-0.5">{c.content}</p>
        {!isReply && user && (
          <button
            onClick={() => { setReplyTo(c); }}
            className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Reply className="h-3 w-3" /> Reply
          </button>
        )}
      </div>
      {user?.id === c.user_id && (
        <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-slide-up max-h-[75vh] min-h-[40vh] flex flex-col rounded-t-2xl border-t border-border bg-card pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Comments ({totalCount})</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : totalCount === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="space-y-3">
                <CommentItem c={c} />
                {c.replies?.map((r) => (
                  <CommentItem key={r.id} c={r} isReply />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Typing bar */}
        {user && (
          <div className="border-t border-border px-4 py-3 bg-card">
            {replyTo && (
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[11px] text-muted-foreground">
                  <Reply className="h-3 w-3 inline mr-1" />
                  Replying to <span className="font-semibold text-foreground">{replyTo.profile?.display_name || "User"}</span>
                </span>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {newComment.trim().length > 0 && (
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-[11px] text-muted-foreground">typing...</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <img
                src={"https://i.pravatar.cc/150?u=" + user.id}
                alt=""
                className="h-8 w-8 rounded-full object-cover flex-shrink-0 bg-muted"
              />
              <div className="flex-1 relative">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={replyTo ? `Reply to ${replyTo.profile?.display_name || "User"}...` : "Add a comment..."}
                  className="w-full rounded-full bg-secondary px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                  autoFocus={!!replyTo}
                />
                {newComment.trim().length > 0 && (
                  <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {newComment.trim().length}/500
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!newComment.trim() || sending}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-transform active:scale-90"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSheet;
