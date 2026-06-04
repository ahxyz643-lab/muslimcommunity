import { useEffect, useState, Fragment } from "react";
import TopBar from "@/components/TopBar";
import PostCard, { PostWithProfile } from "@/components/PostCard";
import ReelsPreviewBar from "@/components/ReelsPreviewBar";
import JobInlineCard from "@/components/JobInlineCard";
import DonationInlineCard from "@/components/DonationInlineCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    if (user) {
      const { data } = await supabase.rpc("get_personalized_feed", { _user_id: user.id, _limit: 60, _offset: 0, _videos_only: false });
      const posts = (data || []).filter((r: any) => r.kind === "post");
      const userIds = [...new Set(posts.map((p: any) => p.user_id))] as string[];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, verified").in("user_id", userIds);
      const map = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setPosts(posts.map((p: any) => ({ ...p, language: null, updated_at: p.created_at, profiles: map.get(p.user_id) || null })));
    } else {
      const result = await fetchPostsWithProfiles(supabase.from("posts").select("*").order("created_at", { ascending: false }));
      setPosts(result);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => { loadPosts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="pb-20 pt-14">
      <TopBar />
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
