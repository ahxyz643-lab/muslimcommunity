import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import TopBar from "@/components/TopBar";
import PostCard, { PostWithProfile } from "@/components/PostCard";
import StoriesBar from "@/components/StoriesBar";
import GuestHero from "@/components/GuestHero";
import JobInlineCard from "@/components/JobInlineCard";
import DonationInlineCard from "@/components/DonationInlineCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles, getProfiles } from "@/lib/posts";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { cacheGet, cacheSet } from "@/lib/offline/db";
import { useOffline } from "@/hooks/useOffline";

const PAGE_SIZE = 15;
const FEED_TTL = 5 * 60 * 1000;
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

const Home = () => {
  const { user } = useAuth();
  const { online } = useOffline();
  const cacheKey = `feed:home:${user?.id || "guest"}`;
  useSeo(
    "Muslim Community — Your digital ummah",
    "Connect with the Muslim community: posts, reels, jobs, donations, and real-time messaging.",
  );
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const refreshTimer = useRef<number | undefined>(undefined);

  const fetchPage = useCallback(async (offset: number): Promise<PostWithProfile[]> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];
    if (user) {
      const { data } = await supabase.rpc("get_personalized_feed", { _user_id: user.id, _limit: PAGE_SIZE, _offset: offset, _videos_only: false });
      const rows = (data || []).filter((r: any) => r.kind === "post");
      const userIds = [...new Set(rows.map((p: any) => p.user_id))] as string[];
      if (userIds.length === 0) return [];
      const map = await getProfiles(userIds);
      return shuffle(rows).map((p: any) => ({ ...p, language: null, updated_at: p.created_at, profiles: map.get(p.user_id) || null }));
    }
    return shuffle(await fetchPostsWithProfiles(
      supabase.from("posts").select("*").order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
    ));
  }, [user?.id]);

  const loadPosts = useCallback(async (force = false) => {
    // Fresh cache (<5 min) → zero database calls on refresh/navigation.
    if (!force) {
      const fresh = await cacheGet<PostWithProfile[]>(cacheKey, FEED_TTL);
      if (fresh?.length) {
        setPosts(shuffle(fresh));
        offsetRef.current = fresh.length;
        setHasMore(true);
        setLoading(false);
        return;
      }
    }
    const cached = await cacheGet<PostWithProfile[]>(cacheKey);
    if (cached?.length) {
      setPosts((prev) => (prev.length ? prev : shuffle(cached)));
      offsetRef.current = Math.max(offsetRef.current, cached.length);
      setLoading(false);
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setHasMore(false);
      return;
    }
    const first = await fetchPage(0);
    if (first.length === 0 && cached?.length) return;
    offsetRef.current = first.length;
    setHasMore(first.length >= PAGE_SIZE);
    setPosts(first);
    setLoading(false);
    void cacheSet(cacheKey, first.slice(0, 40));
  }, [fetchPage, cacheKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { setHasMore(false); return; }
    setLoadingMore(true);
    const next = await fetchPage(offsetRef.current);
    if (next.length === 0) {
      setHasMore(false);
    } else {
      offsetRef.current += next.length;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...next.filter((p) => !seen.has(p.id))];
        void cacheSet(cacheKey, merged.slice(0, 40));
        return merged;
      });
      if (next.length < PAGE_SIZE) setHasMore(false);
    }
    setLoadingMore(false);
  }, [fetchPage, hasMore, loadingMore, cacheKey]);

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;
    loadPosts();
    if (!user || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    // Only react to the current user's own new posts (not every post app-wide).
    const channel = supabase
      .channel(`posts-feed-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `user_id=eq.${user.id}` }, () => {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => { void loadPosts(true); }, 1500);
      })
      .subscribe();
    return () => { window.clearTimeout(refreshTimer.current); supabase.removeChannel(channel); };
  }, [user?.id, online]);

  // Pull-to-refresh: force a fresh fetch when user pulls down at the top.
  useEffect(() => {
    let startY = 0, pulling = false;
    const onStart = (e: TouchEvent) => { pulling = window.scrollY <= 0; startY = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      if (pulling && e.changedTouches[0].clientY - startY > 90) { offsetRef.current = 0; void loadPosts(true); }
      pulling = false;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [loadPosts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, loading]);

  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="pb-20 pt-14">
      <TopBar />
      {!user && (
        <GuestHero
          onContinueGuest={() =>
            window.scrollTo({ top: window.innerHeight * 0.6, behavior: "smooth" })
          }
        />
      )}
      <StoriesBar />
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-foreground">No posts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to share something!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post, idx) => (
            <Fragment key={post.id}>
              <PostCard post={post} onDelete={handleDelete} />
              {(idx + 1) % 10 === 0 && idx !== posts.length - 1 && (
                ((idx + 1) / 10) % 2 === 1 ? <JobInlineCard /> : <DonationInlineCard />
              )}
            </Fragment>
          ))}
        </div>
      )}
      {!loading && posts.length > 0 && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          {loadingMore ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : !hasMore ? (
            <p className="text-xs text-muted-foreground">You're all caught up</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Home;
