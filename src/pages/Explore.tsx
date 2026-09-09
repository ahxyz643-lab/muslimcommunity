import { useEffect, useState } from "react";
import { Search, TrendingUp, Loader2, UserPlus, UserCheck, Play, HandHeart } from "lucide-react";
import { getVideoSrc } from "@/lib/video";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useNavigate } from "react-router-dom";
import { cacheGet, cacheSet } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/queue";
import { useOffline } from "@/hooks/useOffline";

const trendingTopics = [
  "#IslamicReminders", "#Quran", "#Hadith", "#MuslimCreators",
  "#HalalFood", "#IslamicArt", "#Ramadan2026", "#Dawah",
];

const Explore = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tab, setTab] = useState<"posts" | "reels" | "donations">("posts");
  const { user } = useAuth();
  const { online } = useOffline();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // debounce search so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["suggested-profiles", user?.id],
    queryFn: async () => {
      if (!navigator.onLine) return (await cacheGet<any[]>("explore:profiles")) || [];
      let q = supabase.from("profiles").select("*").limit(10);
      if (user?.id) q = q.neq("user_id", user.id);
      const { data } = await q;
      void cacheSet("explore:profiles", data || []);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: followingIds = [] } = useQuery({
    queryKey: ["following-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      return data?.map((f) => f.following_id) || [];
    },
    enabled: !!user && online,
    staleTime: 60 * 1000,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["explore-posts", debouncedQuery],
    queryFn: async () => {
      const key = `explore:posts:${debouncedQuery}`;
      if (!navigator.onLine) return (await cacheGet<any[]>(key)) || (await cacheGet<any[]>("explore:posts:")) || [];
      let q = supabase.from("posts").select("*").order("likes_count", { ascending: false }).limit(20);
      if (debouncedQuery) q = q.ilike("content", `%${debouncedQuery}%`);
      const rows = await fetchPostsWithProfiles(q);
      void cacheSet(key, rows);
      return rows;
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    const isFollowing = followingIds.includes(targetId);
    if (!navigator.onLine) {
      await enqueue(isFollowing ? "unfollow" : "follow", `follow:${user.id}:${targetId}`, { follower_id: user.id, following_id: targetId });
      queryClient.setQueryData(["following-ids", user.id], (prev: string[] = []) =>
        isFollowing ? prev.filter((id) => id !== targetId) : [...prev, targetId],
      );
      return;
    }
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    }
    queryClient.invalidateQueries({ queryKey: ["following-ids"] });
  };

  const { data: exReels = [] } = useQuery({
    queryKey: ["explore-reels"],
    queryFn: async () => {
      if (!navigator.onLine) return (await cacheGet<any[]>("explore:reels")) || [];
      const rows = (await supabase.from("reels").select("*").order("created_at", { ascending: false }).limit(24)).data || [];
      void cacheSet("explore:reels", rows);
      return rows;
    },
    enabled: tab === "reels",
    staleTime: 5 * 60 * 1000,
  });
  const { data: exDonations = [] } = useQuery({
    queryKey: ["explore-donations"],
    queryFn: async () => {
      if (!navigator.onLine) return (await cacheGet<any[]>("explore:donations")) || [];
      const rows = (await supabase.from("donations").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(20)).data || [];
      void cacheSet("explore:donations", rows);
      return rows;
    },
    enabled: tab === "donations",
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="pb-20 pt-4">
      {profiles.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Community Members</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {profiles.map((p) => {
              const isFollowing = followingIds.includes(p.user_id);
              return (
                <div key={p.id} className="flex w-36 flex-shrink-0 flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
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
                      isFollowing ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
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
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Muslim Community..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
      </div>

      <div className="mb-3 flex gap-2 px-4">
        {[
          { id: "posts", label: "Posts", icon: TrendingUp },
          { id: "reels", label: "Reels", icon: Play },
          { id: "donations", label: "Donate", icon: HandHeart },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === "reels" && (
        <div className="grid grid-cols-3 gap-1 px-1">
          {exReels.map((r: any) => (
            <button key={r.id} onClick={() => navigate("/reels")} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-secondary">
              <video src={getVideoSrc(r)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <Play className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-white text-white" />
            </button>
          ))}
          {!exReels.length && <p className="col-span-3 py-8 text-center text-xs text-muted-foreground">No reels yet</p>}
        </div>
      )}
      {tab === "donations" && (
        <div className="space-y-2 px-3">
          {exDonations.map((d: any) => (
            <button key={d.id} onClick={() => navigate("/donations")} className="block w-full rounded-xl border border-border bg-card p-3 text-left">
              <p className="text-sm font-semibold">{d.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{d.kind}{d.amount ? ` · ${d.currency} ${d.amount}` : ""}</p>
            </button>
          ))}
          {!exDonations.length && <p className="py-8 text-center text-xs text-muted-foreground">No approved causes</p>}
        </div>
      )}

      {tab === "posts" && <>

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
      </>}
    </div>
  );
};

export default Explore;
