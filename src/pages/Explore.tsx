import { useState } from "react";
import { Search, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard, { PostWithProfile } from "@/components/PostCard";

const trendingTopics = [
  "#IslamicReminders", "#Quran", "#Hadith", "#MuslimCreators",
  "#HalalFood", "#IslamicArt", "#Ramadan2026", "#Dawah",
];

const Explore = () => {
  const [query, setQuery] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["suggested-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").limit(10);
      return data || [];
    },
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["explore-posts", query],
    queryFn: async () => {
      let q = supabase.from("posts").select("*").order("likes_count", { ascending: false }).limit(20);
      if (query.trim()) {
        q = q.ilike("content", `%${query.trim()}%`);
      }
      return fetchPostsWithProfiles(q);
    },
  });

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
            {profiles.map((p) => (
              <div key={p.id} className="flex w-32 flex-shrink-0 flex-col items-center gap-2 rounded-xl bg-card p-4 border border-border">
                <img src={p.avatar_url || "https://i.pravatar.cc/150"} alt={p.display_name || ""} className="h-14 w-14 rounded-full object-cover" />
                <span className="w-full truncate text-center text-xs font-medium text-foreground">{p.display_name || "User"}</span>
                <span className="text-[10px] text-muted-foreground">@{p.username || "user"}</span>
              </div>
            ))}
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
