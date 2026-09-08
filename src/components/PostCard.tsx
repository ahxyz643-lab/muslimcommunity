import { useState, useRef, useEffect, memo } from "react";
import { Heart, MessageCircle, Repeat2, Bookmark, Share2, MoreHorizontal, Play, Pause, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import VerifiedBadge from "@/components/VerifiedBadge";
import CommentsSheet from "@/components/CommentsSheet";
import { getVideoSrc } from "@/lib/video";
import FollowButton from "@/components/FollowButton";
import LoginPromptDialog from "@/components/LoginPromptDialog";
import HiringInlineCard from "@/components/HiringInlineCard";
import { enqueue } from "@/lib/offline/queue";
import { cacheGet, cacheSet } from "@/lib/offline/db";
import { isMediaCached, saveForOffline } from "@/lib/offline/media";
import { Download, WifiOff, CheckCircle2, RefreshCw } from "lucide-react";

export interface PostWithProfile {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  telegram_file_id?: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  saves_count: number;
  language: string | null;
  created_at: string;
  user_id: string;
  purpose?: string | null;
  title?: string | null;
  category?: string | null;
  location?: string | null;
  hashtags?: string[] | null;
  job_id?: string | null;
  donation_id?: string | null;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
}

const PostCardBase = ({ post, onDelete }: { post: PostWithProfile; onDelete?: (id: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [savesCount, setSavesCount] = useState(post.saves_count);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<null | string>(null);
  const [videoCached, setVideoCached] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = post.video_url || post.telegram_file_id ? getVideoSrc(post) : "";

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  useEffect(() => {
    if (!videoSrc) return;
    let cancelled = false;
    void isMediaCached(videoSrc).then((c) => { if (!cancelled) setVideoCached(c); });
    return () => { cancelled = true; };
  }, [videoSrc]);

  // Check initial status
  useEffect(() => {
    if (!user) return;
    const key = `post-state:${user.id}:${post.id}`;
    if (!navigator.onLine) {
      void cacheGet<{ liked: boolean; saved: boolean; reposted: boolean }>(key).then((s) => {
        if (s) { setLiked(s.liked); setSaved(s.saved); setReposted(s.reposted); }
      });
      return;
    }
    let cancelled = false;
    const state = { liked: false, saved: false, reposted: false };
    supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => { if (cancelled) return; state.liked = !!data; if (data) setLiked(true); void cacheSet(key, state); });
    supabase.from("saves").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => { if (cancelled) return; state.saved = !!data; if (data) setSaved(true); void cacheSet(key, state); });
    supabase.from("reposts").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle()
      .then(({ data }) => { if (cancelled) return; state.reposted = !!data; if (data) setReposted(true); void cacheSet(key, state); });
    return () => { cancelled = true; };
  }, [user?.id, post.id]);

  const handleLike = async () => {
    if (!user) { setLoginPrompt("like posts"); return; }
    if (!navigator.onLine) {
      const next = !liked;
      setLiked(next);
      setLikesCount((c) => Math.max(0, c + (next ? 1 : -1)));
      await enqueue(next ? "like" : "unlike", `like:${user.id}:${post.id}`, { user_id: user.id, post_id: post.id });
      return;
    }
    if (liked) {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id);
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
    } else {
      // Check if already liked (prevent duplicate)
      const { data: existing } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle();
      if (existing) return;
      await supabase.from("likes").insert({ user_id: user.id, post_id: post.id });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
  };

  const handleSave = async () => {
    if (!user) { setLoginPrompt("save posts"); return; }
    if (!navigator.onLine) {
      const next = !saved;
      setSaved(next);
      setSavesCount((c) => Math.max(0, c + (next ? 1 : -1)));
      await enqueue(next ? "save" : "unsave", `save:${user.id}:${post.id}`, { user_id: user.id, post_id: post.id });
      return;
    }
    if (saved) {
      await supabase.from("saves").delete().eq("user_id", user.id).eq("post_id", post.id);
      setSaved(false);
      setSavesCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("saves").insert({ user_id: user.id, post_id: post.id });
      setSaved(true);
      setSavesCount((c) => c + 1);
    }
  };

  const handleRepost = async () => {
    if (!user) { setLoginPrompt("repost"); return; }
    if (!navigator.onLine) {
      const next = !reposted;
      setReposted(next);
      setRepostsCount((c) => Math.max(0, c + (next ? 1 : -1)));
      await enqueue(next ? "repost" : "unrepost", `repost:${user.id}:${post.id}`, { user_id: user.id, post_id: post.id });
      return;
    }
    if (reposted) {
      await supabase.from("reposts").delete().eq("user_id", user.id).eq("post_id", post.id);
      setReposted(false);
      setRepostsCount((c) => Math.max(0, c - 1));
    } else {
      // Check if already reposted (prevent duplicate)
      const { data: existing } = await supabase.from("reposts").select("id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle();
      if (existing) return;
      await supabase.from("reposts").insert({ user_id: user.id, post_id: post.id });
      setReposted(true);
      setRepostsCount((c) => c + 1);
      toast({ title: "Reposted! 🔄" });
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

  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !videoRef.current?.paused) {
        videoRef.current?.pause();
        setIsPlaying(false);
      }
    }, { threshold: 0.35 });
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [videoSrc]);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      void videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setVideoFailed(true));
    }
  };

  const formatCount = (n: number) => {
    if (n <= 0) return "";
    return n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toString();
  };

  const profile = post.profiles;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });

  return (
    <>
      <article className="border-b border-border animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(user?.id === post.user_id ? "/profile" : `/user/${post.user_id}`)} className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || "https://i.pravatar.cc/150"}
              alt={profile?.display_name || "User"}
              loading="lazy"
              decoding="async"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
            />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{profile?.display_name || "User"}</span>
                {profile?.verified && <VerifiedBadge size="sm" />}
              </div>
              <span className="text-xs text-muted-foreground">@{profile?.username || "user"} · {timeAgo}</span>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {user?.id !== post.user_id && <FollowButton targetUserId={post.user_id} />}
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
        </div>

        {/* Content */}
        <div className="px-4 pb-2">
          {post.title && post.purpose && post.purpose !== "post" && (
            <h3 className="mb-1 font-serif text-lg leading-snug text-foreground">{post.title}</h3>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
        </div>

        {post.image_url && (
          <div className="px-4 pb-3">
            <img
              src={post.image_url}
              alt="Post content"
              loading="lazy"
              decoding="async"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 400 }}
            />
          </div>
        )}

        {videoSrc && (
          <div className="relative px-4 pb-3">
            {!isOnline && !videoCached ? (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 text-center">
                <WifiOff className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Internet required to play this video</p>
              </div>
            ) : (
            <>
            {videoFailed ? (
              <button type="button" onClick={() => { setVideoFailed(false); videoRef.current?.load(); }} className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl bg-secondary text-sm text-muted-foreground" aria-label="Retry video">
                <RefreshCw className="size-5" /> Unable to play video — retry
              </button>
            ) : <button
              type="button"
              onClick={toggleVideo}
              className="block w-full"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full rounded-xl object-cover pointer-events-none"
                style={{ maxHeight: 400 }}
                muted
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
              />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-glow">
                {isPlaying ? <Pause className="size-6" /> : <Play className="size-6 ml-0.5" />}
              </span>
            </button>}
            {videoCached ? (
              <span className="absolute bottom-5 right-6 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-medium text-primary backdrop-blur">
                <CheckCircle2 className="h-3 w-3" /> Available offline
              </span>
            ) : isOnline ? (
              <button
                onClick={async () => {
                  setSavingOffline(true);
                  const ok = await saveForOffline(videoSrc);
                  setSavingOffline(false);
                  setVideoCached(ok);
                  toast({ title: ok ? "Saved for offline" : "Couldn't save video offline" });
                }}
                disabled={savingOffline}
                className="absolute bottom-5 right-6 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur disabled:opacity-50"
              >
                <Download className="h-3 w-3" /> {savingOffline ? "Saving…" : "Save offline"}
              </button>
            ) : null}
            </>
            )}
          </div>
        )}

        {post.purpose === "hiring" && post.job_id && (
          <HiringInlineCard jobId={post.job_id} />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-5">
            <button onClick={handleLike} className="group flex items-center gap-1.5">
              <Heart className={`h-5 w-5 transition-all duration-200 ${liked ? "fill-destructive text-destructive scale-110" : "text-muted-foreground group-hover:text-destructive"}`} />
              <span className={`text-xs ${liked ? "text-destructive font-medium" : "text-muted-foreground"}`}>{formatCount(likesCount)}</span>
            </button>
            <button onClick={() => { if (!user) { setLoginPrompt("comment"); return; } setShowComments(true); }} className="group flex items-center gap-1.5">
              <MessageCircle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="text-xs text-muted-foreground">{formatCount(commentsCount)}</span>
            </button>
            <button onClick={handleRepost} className="group flex items-center gap-1.5">
              <Repeat2 className={`h-5 w-5 transition-all duration-200 ${reposted ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary"}`} />
              <span className={`text-xs ${reposted ? "text-primary font-medium" : "text-muted-foreground"}`}>{formatCount(repostsCount)}</span>
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

      {showComments && (
        <CommentsSheet
          postId={post.id}
          onClose={() => setShowComments(false)}
          onCountChange={(d) => setCommentsCount((c) => c + d)}
        />
      )}
      <LoginPromptDialog open={!!loginPrompt} onOpenChange={(v) => !v && setLoginPrompt(null)} action={loginPrompt || undefined} />
    </>
  );
};

const PostCard = memo(PostCardBase, (a, b) =>
  a.post.id === b.post.id &&
  a.post.likes_count === b.post.likes_count &&
  a.post.comments_count === b.post.comments_count &&
  a.post.reposts_count === b.post.reposts_count &&
  a.post.saves_count === b.post.saves_count,
);

export default PostCard;
