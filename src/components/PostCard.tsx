import { useState, useRef } from "react";
import { Heart, MessageCircle, Repeat2, Bookmark, Share2, MoreHorizontal, Play, Pause, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export interface PostWithProfile {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  saves_count: number;
  language: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
}

const PostCard = ({ post, onDelete }: { post: PostWithProfile; onDelete?: (id: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [savesCount, setSavesCount] = useState(post.saves_count);
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check initial like/save status
  useState(() => {
    if (!user) return;
    supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => { if (data) setLiked(true); });
    supabase.from("saves").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => { if (data) setSaved(true); });
  });

  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (saved) {
      await supabase.from("saves").delete().eq("user_id", user.id).eq("post_id", post.id);
      setSaved(false);
      setSavesCount((c) => c - 1);
    } else {
      await supabase.from("saves").insert({ user_id: user.id, post_id: post.id });
      setSaved(true);
      setSavesCount((c) => c + 1);
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: "Error", description: "Could not delete post", variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      onDelete?.(post.id);
    }
    setShowMenu(false);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      toast({ title: "Link copied!" });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const profile = post.profiles;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });

  return (
    <article className="border-b border-border animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={profile?.avatar_url || "https://i.pravatar.cc/150"}
            alt={profile?.display_name || "User"}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">
                {profile?.display_name || "User"}
              </span>
              {profile?.verified && (
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              @{profile?.username || "user"} · {timeAgo}
            </span>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-border bg-card p-1 shadow-lg">
              {user?.id === post.user_id && (
                <button onClick={handleDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-secondary">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
              <button onClick={() => { handleShare(); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                <Share2 className="h-4 w-4" /> Copy Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="px-4 pb-3">
          <img src={post.image_url} alt="Post content" className="w-full rounded-xl object-cover" style={{ maxHeight: 400 }} />
        </div>
      )}

      {/* Video */}
      {post.video_url && (
        <div className="relative px-4 pb-3">
          <video
            ref={videoRef}
            src={post.video_url}
            className="w-full rounded-xl object-cover"
            style={{ maxHeight: 400 }}
            onEnded={() => setIsPlaying(false)}
            playsInline
          />
          <button
            onClick={toggleVideo}
            className="absolute inset-4 bottom-6 flex items-center justify-center rounded-xl bg-background/30 opacity-0 transition-opacity hover:opacity-100"
          >
            {isPlaying ? <Pause className="h-10 w-10 text-foreground" /> : <Play className="h-10 w-10 text-foreground" />}
          </button>
          {!isPlaying && (
            <button
              onClick={toggleVideo}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-glow"
            >
              <Play className="h-6 w-6 ml-0.5" />
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="group flex items-center gap-1.5">
            <Heart className={`h-5 w-5 transition-all duration-200 ${liked ? "fill-destructive text-destructive scale-110" : "text-muted-foreground group-hover:text-destructive"}`} />
            <span className={`text-xs ${liked ? "text-destructive font-medium" : "text-muted-foreground"}`}>{formatCount(likesCount)}</span>
          </button>
          <button className="group flex items-center gap-1.5">
            <MessageCircle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-xs text-muted-foreground">{formatCount(post.comments_count)}</span>
          </button>
          <button className="group flex items-center gap-1.5">
            <Repeat2 className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-xs text-muted-foreground">{formatCount(post.reposts_count)}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave}>
            <Bookmark className={`h-5 w-5 transition-all duration-200 ${saved ? "fill-accent text-accent" : "text-muted-foreground hover:text-accent"}`} />
          </button>
          <button onClick={handleShare}>
            <Share2 className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
