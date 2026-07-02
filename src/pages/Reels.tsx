import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import CommentsSheet from "@/components/CommentsSheet";
import { getVideoSrc } from "@/lib/video";
import FollowButton from "@/components/FollowButton";
import LoginPromptDialog from "@/components/LoginPromptDialog";
import { useAuth as _useAuth } from "@/contexts/AuthContext";

interface Reel {
  id: string;
  kind: "post" | "reel";
  user_id: string;
  video_url: string | null;
  telegram_file_id?: string | null;
  caption: string | null;
  music_name?: string | null;
  filter?: string | null;
  text_overlay?: string | null;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  };
  liked?: boolean;
}

const FILTER_CSS: Record<string, string> = {
  none: "",
  warm: "sepia(0.3) saturate(1.4) hue-rotate(-10deg)",
  cool: "saturate(1.2) hue-rotate(15deg) brightness(1.05)",
  mono: "grayscale(1) contrast(1.1)",
  vintage: "sepia(0.5) contrast(1.1) brightness(0.95)",
  vivid: "saturate(1.6) contrast(1.15)",
  noir: "grayscale(1) contrast(1.4) brightness(0.9)",
};

const ReelItem = ({ reel, isActive, onLike, onComment, onShare, muted, onToggleMute, onView }: {
  reel: Reel; isActive: boolean; onLike: () => void; onComment: () => void; onShare: () => void;
  muted: boolean; onToggleMute: () => void; onView: () => void;
}) => {
  const { user: _viewer } = _useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
      setPaused(false);
      if (!viewedRef.current) {
        viewedRef.current = true;
        onView();
      }
    } else {
      v.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  return (
    <div className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={getVideoSrc(reel)}
        loop
        playsInline
        muted={muted}
        onClick={togglePlay}
        className="h-full w-full object-cover"
        style={{ filter: FILTER_CSS[reel.filter || "none"] }}
      />

      {reel.text_overlay && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 max-w-[80%]">
          <p className="text-center text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {reel.text_overlay}
          </p>
        </div>
      )}

      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
            <div className="h-0 w-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-white" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Mute button - positioned lower so it doesn't overlap header */}
      <button
        onClick={onToggleMute}
        className="absolute right-3 top-16 rounded-full bg-black/50 p-2.5 backdrop-blur-sm"
      >
        {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
      </button>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-5">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <Heart className={`h-8 w-8 drop-shadow-lg ${reel.liked ? "fill-destructive text-destructive" : "text-white"}`} />
          <span className="text-xs font-semibold text-white drop-shadow-lg">{reel.likes_count > 0 ? reel.likes_count : ""}</span>
        </button>
        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
          <span className="text-xs font-semibold text-white drop-shadow-lg">{reel.comments_count > 0 ? reel.comments_count : ""}</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center gap-1">
          <Share2 className="h-7 w-7 text-white drop-shadow-lg" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-4 px-4 pr-20">
        <div className="flex items-center gap-2 flex-wrap">
          <img
            src={reel.profile?.avatar_url || "https://i.pravatar.cc/150"}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
          />
          <span className="text-sm font-semibold text-white drop-shadow-md">@{reel.profile?.username || "user"}</span>
          {reel.profile?.verified && <VerifiedBadge size="sm" />}
          {_viewer?.id !== reel.user_id && (
            <FollowButton targetUserId={reel.user_id} variant="pill-glass" className="ml-1" />
          )}
        </div>
        {reel.caption && <p className="mt-2 text-sm text-white/95 drop-shadow-md line-clamp-2">{reel.caption}</p>}
        {reel.music_name && (
          <div className="mt-2 flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5 text-white" />
            <span className="text-xs text-white/90 drop-shadow-md">{reel.music_name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Reels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const startId = params.get("start");
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [commentKind, setCommentKind] = useState<"post" | "reel">("reel");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadReels = useCallback(async () => {
    let merged: any[] = [];
    if (user) {
      const { data } = await supabase.rpc("get_personalized_feed", {
        _user_id: user.id, _limit: 80, _offset: 0, _videos_only: true,
      });
      merged = data || [];
    }
    // Fallback: query reels table directly
    if (!merged.length) {
      const { data } = await supabase.from("reels").select("*").order("created_at", { ascending: false }).limit(50);
      merged = (data || []).map((r: any) => ({ ...r, kind: "reel", content: r.caption }));
    }
    // Fetch reel-specific extras (music/filter/text_overlay) for kind=reel rows
    const reelIds = merged.filter((m) => m.kind === "reel").map((m) => m.id);
    let reelExtras = new Map<string, any>();
    if (reelIds.length) {
      const { data: rx } = await supabase.from("reels").select("id, music_name, filter, text_overlay, views_count").in("id", reelIds);
      reelExtras = new Map((rx || []).map((r: any) => [r.id, r]));
    }
    const userIds = [...new Set(merged.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified").in("user_id", userIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    let likedReels = new Set<string>(), likedPosts = new Set<string>();
    if (user) {
      const reelIds2 = merged.filter((m) => m.kind === "reel").map((m) => m.id);
      const postIds2 = merged.filter((m) => m.kind === "post").map((m) => m.id);
      if (reelIds2.length) {
        const { data } = await supabase.from("reel_likes").select("reel_id").eq("user_id", user.id).in("reel_id", reelIds2);
        likedReels = new Set((data || []).map((l: any) => l.reel_id));
      }
      if (postIds2.length) {
        const { data } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds2);
        likedPosts = new Set((data || []).map((l: any) => l.post_id));
      }
    }
    let items: Reel[] = merged.map((m: any) => {
      const extra = reelExtras.get(m.id) || {};
      return {
        id: m.id,
        kind: m.kind,
        user_id: m.user_id,
        video_url: m.video_url,
        telegram_file_id: m.telegram_file_id,
        caption: m.content || m.caption || null,
        music_name: extra.music_name || null,
        filter: extra.filter || null,
        text_overlay: extra.text_overlay || null,
        likes_count: m.likes_count || 0,
        comments_count: m.comments_count || 0,
        views_count: extra.views_count || 0,
        created_at: m.created_at,
        profile: profileMap.get(m.user_id) as any,
        liked: m.kind === "reel" ? likedReels.has(m.id) : likedPosts.has(m.id),
      };
    });
    // If startId given, hoist it to front
    if (startId) {
      const idx = items.findIndex((i) => i.id === startId);
      if (idx > 0) items = [items[idx], ...items.slice(0, idx), ...items.slice(idx + 1)];
    }
    setReels(items);
    setLoading(false);
  }, [user, startId]);

  useEffect(() => { loadReels(); }, [loadReels]);

  // IntersectionObserver for active reel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    container.querySelectorAll("[data-reel]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  const handleLike = async (reel: Reel) => {
    if (!user) { navigate("/auth"); return; }
    const likeTbl = reel.kind === "reel" ? "reel_likes" : "likes";
    const idCol = reel.kind === "reel" ? "reel_id" : "post_id";
    if (reel.liked) {
      await supabase.from(likeTbl as any).delete().eq("user_id", user.id).eq(idCol, reel.id);
      setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, liked: false, likes_count: Math.max(0, r.likes_count - 1) } : r));
    } else {
      const { error } = await supabase.from(likeTbl as any).insert({ user_id: user.id, [idCol]: reel.id });
      if (error) return;
      setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, liked: true, likes_count: r.likes_count + 1 } : r));
    }
  };

  const handleShare = async (reel: Reel) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/reels?id=${reel.id}`);
      toast({ title: "Link copied!" });
    } catch { toast({ title: "Could not copy", variant: "destructive" }); }
  };

  const handleView = async (reel: Reel) => {
    if (reel.kind !== "reel") return;
    await supabase.from("reels").update({ views_count: reel.views_count + 1 }).eq("id", reel.id);
    setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, views_count: r.views_count + 1 } : r));
  };

  return (
    <div className="fixed inset-0 z-40 bg-black">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => navigate("/")} className="text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-white">Reels</h1>
        <button onClick={() => navigate("/reels/create")} className="text-white">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reels.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="rounded-2xl bg-white/10 p-6">
            <Plus className="h-10 w-10 text-white" />
          </div>
          <p className="text-lg font-semibold text-white">No reels yet</p>
          <p className="text-sm text-white/70">Be the first to create a reel!</p>
          <button
            onClick={() => navigate("/reels/create")}
            className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Create Reel
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {reels.map((reel, idx) => (
            <div key={reel.id} data-reel data-idx={idx} className="h-full w-full">
              <ReelItem
                reel={reel}
                isActive={idx === activeIdx}
                onLike={() => handleLike(reel)}
                onComment={() => { setCommentReelId(reel.id); setCommentKind(reel.kind); }}
                onShare={() => handleShare(reel)}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                onView={() => handleView(reel)}
              />
            </div>
          ))}
        </div>
      )}

      {commentReelId && (
        <CommentsSheet
          type={commentKind}
          reelId={commentKind === "reel" ? commentReelId : undefined as any}
          postId={commentKind === "post" ? commentReelId : undefined as any}
          onClose={() => setCommentReelId(null)}
          onCountChange={(d) => setReels((prev) => prev.map((r) => r.id === commentReelId ? { ...r, comments_count: Math.max(0, r.comments_count + d) } : r))}
        />
      )}
    </div>
  );
};

export default Reels;
