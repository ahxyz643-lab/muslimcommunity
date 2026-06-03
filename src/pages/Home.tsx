import { useEffect, useState, Fragment } from "react";
import TopBar from "@/components/TopBar";
import PostCard, { PostWithProfile } from "@/components/PostCard";
import ReelsPreviewBar from "@/components/ReelsPreviewBar";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import { Loader2 } from "lucide-react";

const Home = () => {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    const result = await fetchPostsWithProfiles(
      supabase.from("posts").select("*").order("created_at", { ascending: false })
    );
    setPosts(result);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => { loadPosts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
              {/* Inject a Reels strip every 5 posts for Instagram-like feed */}
              {(idx + 1) % 5 === 0 && idx !== posts.length - 1 && (
                <ReelsPreviewBar />
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
