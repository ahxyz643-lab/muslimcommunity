import { useState } from "react";
import { Search, TrendingUp, Loader2, UserPlus, UserCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useNavigate } from "react-router-dom";

const trendingTopics = [
  "#IslamicReminders", "#Quran", "#Hadith", "#MuslimCreators",
  "#HalalFood", "#IslamicArt", "#Ramadan2026", "#Dawah",
];

const Explore = () => {
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profiles = [] } = useQuery({
    queryKey: ["suggested-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").neq("user_id", user?.id || "").limit(10);
      return data || [];
    },
  });

  const { data: followingIds = [] } = useQuery({
    queryKey: ["following-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      return data?.map((f) => f.following_id) || [];
    },
    enabled: !!user,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["explore-posts", query],
    queryFn: async () => {
      let q = supabase.from("posts").select("*").order("likes_count", { ascending: false }).limit(20);
      if (query.trim()) q = q.ilike("content", `%${query.trim()}%`);
      return fetchPostsWithProfiles(q);
    },
  });

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    const isFollowing = followingIds.includes(targetId);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    }
    queryClient.invalidateQueries({ queryKey: ["following-ids"] });
  };

  return (
    <div className="pb-20 pt-4">
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Muslim Community..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Trending Topics</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((topic) => (
            <button key={topic} onClick={() => setQuery(topic.replace("#", ""))} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
              {topic}
            </button>
          ))}
        </div>
      </div>

      {profiles.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Community Members</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {profiles.map((p) => {
              const isFollowing = followingIds.includes(p.user_id);
              return (
                <div key={p.id} className="flex w-36 flex-shrink-0 flex-col items-center gap-2 rounded-xl bg-card p-4 border border-border">
                  <button onClick={() => navigate(`/user/${p.user_id}`)}>
                    <img src={p.avatar_url || "https://i.pravatar.cc/150"} alt={p.display_name || ""} className="h-14 w-14 rounded-full object-cover" />
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-medium text-foreground">{p.display_name || "User"}</span>
                    {p.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">@{p.username || "user"}</span>
                  <button
                    onClick={() => handleFollow(p.user_id)}
                    className={`mt-1 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold transition-all ${
                      isFollowing
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isFollowing ? <><UserCheck className="h-3 w-3" />Following</> : <><UserPlus className="h-3 w-3" />Follow</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 px-4 text-sm font-semibold text-foreground">{query ? "Search Results" : "Popular Posts"}</h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{query ? "No posts found" : "No posts yet"}</div>
        ) : (
          <div className="divide-y divide-border">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        )}
      </div>
    </div>
  );
};

export default Explore;
