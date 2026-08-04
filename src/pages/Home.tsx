import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import TopBar from "@/components/TopBar";
import PostCard, { PostWithProfile } from "@/components/PostCard";
import ReelsPreviewBar from "@/components/ReelsPreviewBar";
import GuestHero from "@/components/GuestHero";
import JobInlineCard from "@/components/JobInlineCard";
import DonationInlineCard from "@/components/DonationInlineCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";

const PAGE_SIZE = 15;

const Home = () => {
  const { user } = useAuth();
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

  const fetchPage = useCallback(async (offset: number): Promise<PostWithProfile[]> => {
    if (user) {
      const { data } = await supabase.rpc("get_personalized_feed", { _user_id: user.id, _limit: PAGE_SIZE, _offset: offset, _videos_only: false });
      const rows = (data || []).filter((r: any) => r.kind === "post");
      const userIds = [...new Set(rows.map((p: any) => p.user_id))] as string[];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified").in("user_id", userIds);
      const map = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return rows.map((p: any) => ({ ...p, language: null, updated_at: p.created_at, profiles: map.get(p.user_id) || null }));
    }
    return fetchPostsWithProfiles(
      supabase.from("posts").select("*").order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
    );
  }, [user?.id]);

  const loadPosts = useCallback(async () => {
    const first = await fetchPage(0);
    offsetRef.current = first.length;
    setHasMore(first.length >= PAGE_SIZE);
    setPosts(first);
    setLoading(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = await fetchPage(offsetRef.current);
    if (next.length === 0) {
      setHasMore(false);
    } else {
      offsetRef.current += next.length;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((p) => !seen.has(p.id))];
      });
      if (next.length < PAGE_SIZE) setHasMore(false);
    }
    setLoadingMore(false);
  }, [fetchPage, hasMore, loadingMore]);

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    offsetRef.current = 0;
    loadPosts();
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => { loadPosts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

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
      <ReelsPreviewBar />
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
    </div>
  );
};

export default Home;
