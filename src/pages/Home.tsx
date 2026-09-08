import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import TopBar from "@/components/TopBar";
import PostCard, { PostWithProfile } from "@/components/PostCard";
import ReelsPreviewBar from "@/components/ReelsPreviewBar";
import StoriesBar from "@/components/StoriesBar";
import GuestHero from "@/components/GuestHero";
import JobInlineCard from "@/components/JobInlineCard";
import DonationInlineCard from "@/components/DonationInlineCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, ImagePlus } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { cacheGet, cacheSet } from "@/lib/offline/db";
import { useOffline } from "@/hooks/useOffline";

const PAGE_SIZE = 15;
type FeedRow = PostWithProfile & { kind?: string; language?: string | null; updated_at?: string };

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
  const [feedFilter, setFeedFilter] = useState<"for-you" | "following" | "latest">(() => {
    const saved = typeof window !== "undefined" ? window.sessionStorage.getItem("home-feed-filter") : null;
    return saved === "following" || saved === "latest" ? saved : "for-you";
  });
  const [feedError, setFeedError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const refreshTimer = useRef<number | undefined>(undefined);

  const fetchPage = useCallback(async (offset: number): Promise<PostWithProfile[]> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];
    if (user && feedFilter === "for-you") {
      const { data } = await supabase.rpc("get_personalized_feed", { _user_id: user.id, _limit: PAGE_SIZE, _offset: offset, _videos_only: false });
      const rows = ((data || []) as FeedRow[]).filter((r) => r.kind === "post");
      const userIds = [...new Set(rows.map((p) => p.user_id))] as string[];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified").in("user_id", userIds);
      const map = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return rows.map((p) => ({ ...p, language: null, updated_at: p.created_at, profiles: map.get(p.user_id) || null }));
    }
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
    if (feedFilter === "following" && user) {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const ids = (follows || []).map((row) => row.following_id);
      if (!ids.length) return [];
      query = query.in("user_id", ids) as typeof query;
    }
    return fetchPostsWithProfiles(query);
  }, [user?.id, feedFilter]);

  const loadPosts = useCallback(async () => {
    // 1) paint instantly from cache, 2) refresh from network when possible
    const cached = await cacheGet<PostWithProfile[]>(cacheKey);
    if (cached?.length) {
      setPosts((prev) => (prev.length ? prev : cached));
      offsetRef.current = Math.max(offsetRef.current, cached.length);
      setLoading(false);
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setHasMore(false);
      return;
    }
    try {
      const first = await fetchPage(0);
      setFeedError(null);
      if (first.length === 0 && cached?.length) return;
    offsetRef.current = first.length;
    setHasMore(first.length >= PAGE_SIZE);
    setPosts(first);
    setLoading(false);
      void cacheSet(cacheKey, first.slice(0, 40));
    } catch {
      setFeedError("We couldn't load the community feed.");
      setLoading(false);
    }
  }, [fetchPage, cacheKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { setHasMore(false); return; }
    setLoadingMore(true);
    try {
      const next = await fetchPage(offsetRef.current);
      setFeedError(null);
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
    } catch {
      setFeedError("We couldn't load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, cacheKey]);

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;
    loadPosts();
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        // debounce bursty realtime events so the feed doesn't refetch per row
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => { void loadPosts(); }, 1500);
      })
      .subscribe();
    return () => { window.clearTimeout(refreshTimer.current); supabase.removeChannel(channel); };
  }, [user?.id, online, feedFilter, loadPosts]);

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
      <section className="mx-auto max-w-2xl px-4 pt-3" aria-label="Create and filter feed">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {(["for-you", "following", "latest"] as const).map((filter) => (
            <button key={filter} onClick={() => { setFeedFilter(filter); window.sessionStorage.setItem("home-feed-filter", filter); }} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${feedFilter === filter ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {filter === "for-you" ? "For You" : filter === "following" ? "Following" : "Latest"}
            </button>
          ))}
        </div>
        {user && <button onClick={() => window.location.assign("/create")} className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:border-primary/50">
          <img src={user.user_metadata?.avatar_url || "https://i.pravatar.cc/150"} alt="" className="size-9 rounded-full object-cover" />
          <span className="flex-1 text-sm text-muted-foreground">What&apos;s on your mind?</span>
          <ImagePlus className="size-5 text-primary" aria-hidden="true" />
        </button>}
      </section>
      <StoriesBar />
      <ReelsPreviewBar />
      {feedError && <div className="mx-4 my-4 flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"><span>{feedError}</span><button onClick={() => { setFeedError(null); setLoading(true); void loadPosts(); }} className="flex items-center gap-2 font-semibold text-primary"><RefreshCw className="size-4" /> Retry</button></div>}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-border bg-card px-6 py-14 text-center">
          <p className="text-lg font-semibold text-foreground">{feedFilter === "following" ? "No posts from people you follow" : "No posts yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{online ? "Be the first to share something with the community." : "Reconnect to see the latest community posts."}</p>
          {feedFilter === "following" && <button onClick={() => setFeedFilter("for-you")} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Explore For You</button>}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post, idx) => (
            <Fragment key={post.id}>
              <PostCard post={post} onDelete={handleDelete} />
              {(idx + 1) % 5 === 0 && idx !== posts.length - 1 && (
                <ReelsPreviewBar />
              )}
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
