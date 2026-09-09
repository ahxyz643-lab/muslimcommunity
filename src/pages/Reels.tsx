import { useEffect, useState, useRef, useCallback, memo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Plus, ArrowLeft, Loader2,
  Bookmark, MoreVertical, Maximize2, Flag, EyeOff, Ban, Link2, WifiOff, RotateCcw, Briefcase, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useOffline } from "@/hooks/useOffline";
import VerifiedBadge from "@/components/VerifiedBadge";
import CommentsSheet from "@/components/CommentsSheet";
import { getVideoSrc } from "@/lib/video";
import FollowButton from "@/components/FollowButton";
import LoginPromptDialog from "@/components/LoginPromptDialog";
import ApplyDialog from "@/components/ApplyDialog";
import { useSeo } from "@/hooks/useSeo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Reel {
  id: string;
  kind: "post" | "reel";
  user_id: string;
  video_url: string | null;
  telegram_file_id?: string | null;
  thumbnail_url?: string | null;
  caption: string | null;
  music_name?: string | null;
  filter?: string | null;
  text_overlay?: string | null;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  created_at: string;
  purpose?: string | null;
  job_id?: string | null;
  title?: string | null;
  job?: {
    id: string; title: string; company: string | null; location: string | null;
    salary_range: string | null; applicants_count: number; remote: boolean | null;
  } | null;
  profile?: {
    username: string | null; display_name: string | null; avatar_url: string | null; verified: boolean;
  };
  liked?: boolean;
  saved?: boolean;
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

const PAGE_SIZE = 6;
const HIDDEN_KEY = "reels:not-interested";

const readHidden = (): string[] => {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); } catch { return []; }
};
const addHidden = (id: string) => {
  const next = [...new Set([...readHidden(), id])].slice(-300);
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
};

/** Splits a caption into text + hashtags for nicer display. */
const renderCaption = (text: string) =>
  text.split(/(\s+)/).map((chunk, i) =>
    chunk.startsWith("#") && chunk.length > 1
      ? <span key={i} className="text-[#e0c278]">{chunk}</span>
      : <span key={i}>{chunk}</span>
  );

type ItemProps = {
  reel: Reel;
  isActive: boolean;
  isNear: boolean;
  muted: boolean;
  offline: boolean;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleMute: () => void;
  onView: () => void;
  onNotInterested: () => void;
  onBlock: () => void;
  onReport: () => void;
};

const ReelItem = memo(({
  reel, isActive, isNear, muted, offline,
  onLike, onSave, onComment, onShare, onToggleMute, onView, onNotInterested, onBlock, onReport,
}: ItemProps) => {
  const { user: viewer } = useAuth();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [loginAsk, setLoginAsk] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const viewedRef = useRef(false);

  const src = getVideoSrc(reel);

  // Play only the active reel; pause everything else.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
      setPaused(false);
      if (!viewedRef.current) { viewedRef.current = true; onView(); }
    } else {
      v.pause();
      if (v.currentTime > 0) v.currentTime = 0;
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Pause when the tab/app goes to background.
  useEffect(() => {
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else if (isActive && !paused) v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isActive, paused]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || failed) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  const goFullscreen = () => {
    const el = wrapRef.current as any;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el);
  };

  const retry = () => {
    setFailed(false); setReady(false); setAttempt((a) => a + 1);
  };

  const shouldLoad = isActive || isNear;

  return (
    <div ref={wrapRef} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
      {/* Thumbnail first, then video */}
      {reel.thumbnail_url && !ready && (
        <img src={reel.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {shouldLoad && !failed && (
        <video
          key={attempt}
          ref={videoRef}
          src={src}
          poster={reel.thumbnail_url || undefined}
          loop
          playsInline
          muted={muted}
          onClick={togglePlay}
          preload={isActive ? "auto" : "metadata"}
          onLoadedData={() => { setReady(true); setFailed(false); }}
          onError={() => { setReady(false); setFailed(true); }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
          className="h-full w-full object-cover"
          style={{ filter: FILTER_CSS[reel.filter || "none"] }}
          aria-label={reel.caption || "Reel video"}
        />
      )}

      {shouldLoad && !ready && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          {offline ? <WifiOff className="h-8 w-8 text-white/70" /> : null}
          <p className="text-sm font-semibold text-white">
            {offline ? "This Reel isn't available offline" : "Video unavailable"}
          </p>
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {reel.text_overlay && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 max-w-[80%] -translate-x-1/2">
          <p className="text-center text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {reel.text_overlay}
          </p>
        </div>
      )}

      {paused && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
            <div className="h-0 w-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-white" />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 to-transparent" />

      {/* Top-right controls */}
      <div className="absolute right-3 top-16 flex flex-col gap-2">
        <button
          onClick={onToggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="rounded-full bg-black/50 p-2.5 backdrop-blur-sm"
        >
          {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
        </button>
        <button
          onClick={goFullscreen}
          aria-label="Toggle fullscreen"
          className="rounded-full bg-black/50 p-2.5 backdrop-blur-sm"
        >
          <Maximize2 className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-32 right-2 flex flex-col items-center gap-4">
        <button onClick={onLike} aria-label={reel.liked ? "Unlike" : "Like"} className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5">
          <Heart className={`h-8 w-8 drop-shadow-lg ${reel.liked ? "fill-destructive text-destructive" : "text-white"}`} />
          <span className="text-xs font-semibold text-white drop-shadow-lg">{reel.likes_count > 0 ? reel.likes_count : ""}</span>
        </button>
        <button onClick={onComment} aria-label="Comments" className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5">
          <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
          <span className="text-xs font-semibold text-white drop-shadow-lg">{reel.comments_count > 0 ? reel.comments_count : ""}</span>
        </button>
        <button onClick={onSave} aria-label={reel.saved ? "Remove from saved" : "Save reel"} className="flex min-h-11 min-w-11 items-center justify-center">
          <Bookmark className={`h-7 w-7 drop-shadow-lg ${reel.saved ? "fill-white text-white" : "text-white"}`} />
        </button>
        <button onClick={onShare} aria-label="Share reel" className="flex min-h-11 min-w-11 items-center justify-center">
          <Share2 className="h-7 w-7 text-white drop-shadow-lg" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="More options" className="flex min-h-11 min-w-11 items-center justify-center">
              <MoreVertical className="h-6 w-6 text-white drop-shadow-lg" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onReport}><Flag className="mr-2 h-4 w-4" /> Report</DropdownMenuItem>
            <DropdownMenuItem onClick={onNotInterested}><EyeOff className="mr-2 h-4 w-4" /> Not interested</DropdownMenuItem>
            {viewer?.id !== reel.user_id && (
              <DropdownMenuItem onClick={onBlock} className="text-destructive focus:text-destructive">
                <Ban className="mr-2 h-4 w-4" /> Block user
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-5 px-4 pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate(`/u/${reel.user_id}`)} aria-label="Open profile">
            <img
              src={reel.profile?.avatar_url || "https://i.pravatar.cc/150"}
              alt={reel.profile?.username ? `${reel.profile.username} avatar` : "User avatar"}
              loading="lazy"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
            />
          </button>
          <span className="text-sm font-semibold text-white drop-shadow-md">@{reel.profile?.username || "user"}</span>
          {reel.profile?.verified && <VerifiedBadge size="sm" />}
          {viewer?.id !== reel.user_id && (
            <FollowButton targetUserId={reel.user_id} variant="pill-glass" className="ml-1" />
          )}
        </div>

        {reel.caption && (
          <p
            onClick={() => setExpanded((e) => !e)}
            className={`mt-2 text-sm text-white/95 drop-shadow-md ${expanded ? "max-h-32 overflow-y-auto" : "line-clamp-2"}`}
          >
            {renderCaption(reel.caption)}
            {!expanded && reel.caption.length > 90 && <span className="ml-1 font-semibold text-white/70">more</span>}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <Music className="h-3.5 w-3.5 text-white" />
          <span className="truncate text-xs text-white/90 drop-shadow-md">
            {reel.music_name || `Original audio · @${reel.profile?.username || "user"}`}
          </span>
        </div>

        {reel.purpose === "hiring" && reel.job && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#c9a84c]/40 bg-black/55 backdrop-blur-xl">
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/20 text-[#c9a84c]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9a84c]">Hiring</p>
                <p className="truncate text-sm font-bold text-white">{reel.job.title}</p>
                <p className="truncate text-[11px] text-white/70">
                  {[reel.job.company, reel.job.location].filter(Boolean).join(" · ")}
                  {reel.job.salary_range ? ` · ${reel.job.salary_range}` : ""}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-white/60">
                  <Users className="h-3 w-3" /> {reel.job.applicants_count} applied
                </p>
              </div>
              {viewer?.id === reel.user_id ? (
                <button onClick={() => navigate("/employer")} className="shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-semibold text-white">
                  Applicants
                </button>
              ) : (
                <button
                  onClick={() => (viewer ? setApplyOpen(true) : setLoginAsk(true))}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold text-[#064e3b]"
                  style={{ background: "linear-gradient(135deg,#c9a84c 0%,#e0c278 100%)" }}
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/15">
        <div className="h-full bg-white/80 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      {reel.purpose === "hiring" && reel.job_id && (
        <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} jobId={reel.job_id} jobTitle={reel.job?.title} />
      )}
      <LoginPromptDialog open={loginAsk} onOpenChange={setLoginAsk} action="apply for jobs" />
    </div>
  );
}, (a, b) =>
  a.reel.id === b.reel.id &&
  a.reel.liked === b.reel.liked &&
  a.reel.saved === b.reel.saved &&
  a.reel.likes_count === b.reel.likes_count &&
  a.reel.comments_count === b.reel.comments_count &&
  a.isActive === b.isActive &&
  a.isNear === b.isNear &&
  a.muted === b.muted &&
  a.offline === b.offline
);
ReelItem.displayName = "ReelItem";

const Reels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { online } = useOffline() as { online: boolean };
  const [params] = useSearchParams();
  const startId = params.get("start") || params.get("id");

  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [commentKind, setCommentKind] = useState<"post" | "reel">("reel");
  const [loginPrompt, setLoginPrompt] = useState<null | string>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const inflight = useRef<Set<string>>(new Set());
  const fetching = useRef(false);
  const blockedRef = useRef<Set<string>>(new Set());
  const touchStartY = useRef(0);

  useSeo("Reels · Muslim Community", "Short videos and inspiration from the Muslim community.");

  /** Hydrate one page of raw rows with profiles, reel extras, job info and like/save state. */
  const hydrate = useCallback(async (rows: any[]): Promise<Reel[]> => {
    if (!rows.length) return [];
    const reelIds = rows.filter((m) => m.kind === "reel").map((m) => m.id);
    const postIds = rows.filter((m) => m.kind === "post").map((m) => m.id);

    const [rx, profilesRes, pmetaRes] = await Promise.all([
      reelIds.length
        ? supabase.from("reels").select("id, music_name, filter, text_overlay, views_count, thumbnail_url").in("id", reelIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified").in("user_id", [...new Set(rows.map((m) => m.user_id))]),
      postIds.length
        ? supabase.from("posts").select("id, purpose, job_id, title").in("id", postIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const reelExtras = new Map((rx.data || []).map((r: any) => [r.id, r]));
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const postMeta = new Map((pmetaRes.data || []).map((p: any) => [p.id, p]));

    let jobMap = new Map<string, any>();
    const jobIds = (pmetaRes.data || []).filter((p: any) => p.purpose === "hiring" && p.job_id).map((p: any) => p.job_id);
    if (jobIds.length) {
      const { data: jobs } = await supabase.from("jobs").select("id, title, company, location, salary_range, applicants_count, remote").in("id", jobIds);
      jobMap = new Map((jobs || []).map((j: any) => [j.id, j]));
    }

    let likedReels = new Set<string>(), likedPosts = new Set<string>();
    let savedReels = new Set<string>(), savedPosts = new Set<string>();
    if (user) {
      const [lr, lp, sr, sp] = await Promise.all([
        reelIds.length ? supabase.from("reel_likes").select("reel_id").eq("user_id", user.id).in("reel_id", reelIds) : Promise.resolve({ data: [] as any[] }),
        postIds.length ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
        reelIds.length ? supabase.from("reel_saves").select("reel_id").eq("user_id", user.id).in("reel_id", reelIds) : Promise.resolve({ data: [] as any[] }),
        postIds.length ? supabase.from("saves").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      likedReels = new Set((lr.data || []).map((l: any) => l.reel_id));
      likedPosts = new Set((lp.data || []).map((l: any) => l.post_id));
      savedReels = new Set((sr.data || []).map((s: any) => s.reel_id));
      savedPosts = new Set((sp.data || []).map((s: any) => s.post_id));
    }

    return rows.map((m: any) => {
      const extra: any = reelExtras.get(m.id) || {};
      const meta: any = postMeta.get(m.id);
      return {
        id: m.id,
        kind: m.kind,
        user_id: m.user_id,
        video_url: m.video_url,
        telegram_file_id: m.telegram_file_id,
        thumbnail_url: extra.thumbnail_url || m.thumbnail_url || null,
        caption: m.content || m.caption || null,
        music_name: extra.music_name || null,
        filter: extra.filter || null,
        text_overlay: extra.text_overlay || null,
        likes_count: m.likes_count || 0,
        comments_count: m.comments_count || 0,
        views_count: extra.views_count || 0,
        created_at: m.created_at,
        purpose: meta?.purpose || null,
        job_id: meta?.job_id || null,
        title: meta?.title || null,
        job: meta?.job_id ? jobMap.get(meta.job_id) || null : null,
        profile: profileMap.get(m.user_id) as any,
        liked: m.kind === "reel" ? likedReels.has(m.id) : likedPosts.has(m.id),
        saved: m.kind === "reel" ? savedReels.has(m.id) : savedPosts.has(m.id),
      } as Reel;
    });
  }, [user]);

  const fetchPage = useCallback(async (reset = false) => {
    if (fetching.current) return;
    if (!reset && !hasMore) return;
    if (!online && !reset) return;
    fetching.current = true;
    if (reset) { offsetRef.current = 0; seenRef.current = new Set(); }
    else setLoadingMore(true);

    try {
      let rows: any[] = [];
      if (user) {
        const { data } = await supabase.rpc("get_personalized_feed", {
          _user_id: user.id, _limit: PAGE_SIZE, _offset: offsetRef.current, _videos_only: true,
        });
        rows = data || [];
      }
      if (!rows.length) {
        const { data } = await supabase
          .from("reels").select("*")
          .order("created_at", { ascending: false })
          .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);
        rows = (data || []).map((r: any) => ({ ...r, kind: "reel", content: r.caption }));
      }

      offsetRef.current += PAGE_SIZE;
      const hidden = new Set(readHidden());
      const fresh = rows.filter(
        (r) => !seenRef.current.has(r.id) && !hidden.has(r.id) && !blockedRef.current.has(r.user_id)
      );
      fresh.forEach((r) => seenRef.current.add(r.id));

      const items = await hydrate(fresh);
      setHasMore(rows.length >= PAGE_SIZE);

      setReels((prev) => {
        let next = reset ? items : [...prev, ...items];
        if (reset && startId) {
          const idx = next.findIndex((i) => i.id === startId);
          if (idx > 0) next = [next[idx], ...next.slice(0, idx), ...next.slice(idx + 1)];
        }
        return next;
      });
    } catch {
      if (online) toast({ title: "Couldn't load reels", description: "Please try again.", variant: "destructive" });
    } finally {
      fetching.current = false;
      setLoadingMore(false);
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, online, hasMore, hydrate, startId]);

  // Initial load (also loads the viewer's block list so blocked creators stay hidden).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user) {
        const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id);
        if (!cancelled) blockedRef.current = new Set((data || []).map((b: any) => b.blocked_id));
      }
      if (!cancelled) { setHasMore(true); fetchPage(true); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load more as the user approaches the end.
  useEffect(() => {
    if (!loading && hasMore && activeIdx >= reels.length - 3) fetchPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, reels.length, hasMore, loading]);

  // Track the active reel.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            setActiveIdx(Number((e.target as HTMLElement).dataset.idx));
          }
        });
      },
      { root: container, threshold: [0.6] }
    );
    container.querySelectorAll("[data-reel]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.length]);

  // Pull-to-refresh at the top of the feed.
  const onTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const c = containerRef.current;
    if (!c || c.scrollTop > 4 || refreshing) return;
    if (e.changedTouches[0].clientY - touchStartY.current > 110) {
      setRefreshing(true); setHasMore(true); fetchPage(true);
    }
  };

  const guard = (key: string) => {
    if (inflight.current.has(key)) return false;
    inflight.current.add(key);
    setTimeout(() => inflight.current.delete(key), 800);
    return true;
  };

  const patch = (id: string, p: Partial<Reel>) =>
    setReels((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const handleLike = async (reel: Reel) => {
    if (!user) { setLoginPrompt("like reels"); return; }
    if (!guard(`like:${reel.id}`)) return;
    const liked = !reel.liked;
    patch(reel.id, { liked, likes_count: Math.max(0, reel.likes_count + (liked ? 1 : -1)) });
    const tbl = reel.kind === "reel" ? "reel_likes" : "likes";
    const col = reel.kind === "reel" ? "reel_id" : "post_id";
    const { error } = liked
      ? await supabase.from(tbl as any).insert({ user_id: user.id, [col]: reel.id })
      : await supabase.from(tbl as any).delete().eq("user_id", user.id).eq(col, reel.id);
    if (error && !`${error.message}`.includes("duplicate")) {
      patch(reel.id, { liked: reel.liked, likes_count: reel.likes_count });
      toast({ title: "Couldn't update your like", variant: "destructive" });
    }
  };

  const handleSave = async (reel: Reel) => {
    if (!user) { setLoginPrompt("save reels"); return; }
    if (!guard(`save:${reel.id}`)) return;
    const saved = !reel.saved;
    patch(reel.id, { saved });
    const tbl = reel.kind === "reel" ? "reel_saves" : "saves";
    const col = reel.kind === "reel" ? "reel_id" : "post_id";
    const { error } = saved
      ? await supabase.from(tbl as any).insert({ user_id: user.id, [col]: reel.id })
      : await supabase.from(tbl as any).delete().eq("user_id", user.id).eq(col, reel.id);
    if (error && !`${error.message}`.includes("duplicate")) {
      patch(reel.id, { saved: reel.saved });
      toast({ title: "Couldn't update saved reels", variant: "destructive" });
    } else {
      toast({ title: saved ? "Saved" : "Removed from saved" });
    }
  };

  const handleShare = async (reel: Reel) => {
    const url = `${window.location.origin}/reels?start=${reel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Reel · Muslim Community", text: reel.caption || "", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      toast({ title: "Couldn't share this reel", variant: "destructive" });
    }
  };

  const handleView = async (reel: Reel) => {
    if (reel.kind !== "reel" || !online) return;
    try {
      await supabase.rpc("increment_reel_view", { _id: reel.id });
      patch(reel.id, { views_count: (reel.views_count || 0) + 1 });
    } catch { /* views are best-effort */ }
  };

  const handleNotInterested = (reel: Reel) => {
    addHidden(reel.id);
    setReels((prev) => prev.filter((r) => r.id !== reel.id));
    toast({ title: "You'll see fewer reels like this" });
  };

  const handleBlock = async (reel: Reel) => {
    if (!user) { setLoginPrompt("block users"); return; }
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: reel.user_id });
    if (error && !`${error.message}`.includes("duplicate")) {
      toast({ title: "Couldn't block this user", variant: "destructive" });
      return;
    }
    blockedRef.current.add(reel.user_id);
    setReels((prev) => prev.filter((r) => r.user_id !== reel.user_id));
    toast({ title: "User blocked" });
  };

  const handleReport = async (reel: Reel) => {
    if (!user) { setLoginPrompt("report content"); return; }
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_id: reel.id, target_type: reel.kind, reason: "inappropriate",
    });
    toast({
      title: error ? "Couldn't send your report" : "Report sent",
      description: error ? "Please try again." : "Our team will review it.",
      variant: error ? "destructive" : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
        <button onClick={() => navigate("/")} aria-label="Go back" className="min-h-11 min-w-11 text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-bold text-white">Reels</h1>
        <button onClick={() => navigate("/reels/create")} aria-label="Create reel" className="min-h-11 min-w-11 text-white">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {!online && (
        <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          You're offline — showing what's cached
        </div>
      )}
      {refreshing && (
        <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reels.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="rounded-2xl bg-white/10 p-6"><Plus className="h-10 w-10 text-white" /></div>
          <p className="text-lg font-semibold text-white">{online ? "No reels yet" : "Nothing cached yet"}</p>
          <p className="text-sm text-white/70">{online ? "Be the first to create a reel!" : "Connect to the internet to load reels."}</p>
          {online && (
            <button
              onClick={() => navigate("/reels/create")}
              className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Create Reel
            </button>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
          style={{ scrollbarWidth: "none" }}
        >
          {reels.map((reel, idx) => (
            <div key={`${reel.id}-${idx}`} data-reel data-idx={idx} className="h-full w-full">
              <ReelItem
                reel={reel}
                isActive={idx === activeIdx}
                isNear={Math.abs(idx - activeIdx) === 1}
                muted={muted}
                offline={!online}
                onLike={() => handleLike(reel)}
                onSave={() => handleSave(reel)}
                onComment={() => { setCommentReelId(reel.id); setCommentKind(reel.kind); }}
                onShare={() => handleShare(reel)}
                onToggleMute={() => setMuted((m) => !m)}
                onView={() => handleView(reel)}
                onNotInterested={() => handleNotInterested(reel)}
                onBlock={() => handleBlock(reel)}
                onReport={() => handleReport(reel)}
              />
            </div>
          ))}
          {loadingMore && (
            <div className="flex h-16 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/70" />
            </div>
          )}
        </div>
      )}

      {commentReelId && (
        <CommentsSheet
          type={commentKind}
          reelId={commentKind === "reel" ? commentReelId : (undefined as any)}
          postId={commentKind === "post" ? commentReelId : (undefined as any)}
          onClose={() => setCommentReelId(null)}
          onCountChange={(d) =>
            setReels((prev) => prev.map((r) => (r.id === commentReelId ? { ...r, comments_count: Math.max(0, r.comments_count + d) } : r)))
          }
        />
      )}
      <LoginPromptDialog open={!!loginPrompt} onOpenChange={(v) => !v && setLoginPrompt(null)} action={loginPrompt || undefined} />
    </div>
  );
};

export default Reels;
