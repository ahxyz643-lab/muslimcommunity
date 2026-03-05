import { useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { trendingTopics, posts, users } from "@/data/mockData";

const Explore = () => {
  const [query, setQuery] = useState("");

  const trendingPosts = posts.filter((p) => p.image);

  return (
    <div className="pb-20 pt-4">
      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Muslim Community..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Trending Topics */}
      <div className="px-4 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Trending Topics</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((topic) => (
            <button
              key={topic}
              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Users */}
      <div className="px-4 pb-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Suggested for you</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex w-32 flex-shrink-0 flex-col items-center gap-2 rounded-xl bg-card p-4 border border-border"
            >
              <img src={user.avatar} alt={user.displayName} className="h-14 w-14 rounded-full object-cover" />
              <span className="w-full truncate text-center text-xs font-medium text-foreground">{user.displayName}</span>
              <span className="text-[10px] text-muted-foreground">{(user.followers / 1000).toFixed(1)}K</span>
              <button className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-emerald-glow">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Grid */}
      <div className="px-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Trending Content</h2>
        <div className="grid grid-cols-2 gap-2">
          {trendingPosts.map((post) => (
            <div key={post.id} className="group relative overflow-hidden rounded-xl">
              <img
                src={post.image}
                alt="Trending"
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-2 left-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs font-medium text-foreground">{post.user.displayName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explore;
