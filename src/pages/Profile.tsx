import { Settings as SettingsIcon, Grid3X3, Bookmark, Heart, BarChart3, Loader2, Clapperboard, Play, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import heroPattern from "@/assets/hero-pattern.jpg";
import { getVideoSrc } from "@/lib/video";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: userPosts = [] } = useQuery({
    queryKey: ["user-posts", user?.id],
    queryFn: () => fetchPostsWithProfiles(
      supabase.from("posts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })
    ),
    enabled: !!user,
  });

  const { data: savedPosts = [] } = useQuery({
    queryKey: ["saved-posts", user?.id],
    queryFn: async () => {
      const { data: saves } = await supabase.from("saves").select("post_id").eq("user_id", user!.id);
      if (!saves || saves.length === 0) return [];
      return fetchPostsWithProfiles(
        supabase.from("posts").select("*").in("id", saves.map((s) => s.post_id)).order("created_at", { ascending: false })
      );
    },
    enabled: !!user && activeTab === "saved",
  });

  const { data: likedPosts = [] } = useQuery({
    queryKey: ["liked-posts", user?.id],
    queryFn: async () => {
      const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user!.id);
      if (!likes || likes.length === 0) return [];
      return fetchPostsWithProfiles(
        supabase.from("posts").select("*").in("id", likes.map((l) => l.post_id)).order("created_at", { ascending: false })
      );
    },
    enabled: !!user && activeTab === "liked",
  });

  const { data: followersCount = 0 } = useQuery({
    queryKey: ["followers-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: userReels = [] } = useQuery({
    queryKey: ["user-reels", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reels").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const tabs = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "reels", icon: Clapperboard, label: "Reels" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    { id: "liked", icon: Heart, label: "Liked" },
    { id: "studio", icon: BarChart3, label: "Studio" },
  ];

  if (profileLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const activePosts = activeTab === "posts" ? userPosts : activeTab === "saved" ? savedPosts : likedPosts;

  return (
    <div className="pb-20">
      <div className="relative h-36">
        <img src={heroPattern} alt="Cover" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute right-3 top-3">
          <button onClick={() => navigate("/settings")} className="rounded-full bg-card/80 p-2 backdrop-blur-sm text-muted-foreground hover:text-foreground">
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative px-4">
        <img src={profile?.avatar_url || "https://i.pravatar.cc/150"} alt={profile?.display_name || ""} className="-mt-12 h-24 w-24 rounded-full border-4 border-card object-cover ring-2 ring-primary" />
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">{profile?.display_name || "User"}</h1>
            {profile?.verified && <VerifiedBadge size="md" />}
          </div>
          <p className="text-sm text-muted-foreground">@{profile?.username || "user"}</p>
          <p className="mt-2 text-sm text-foreground">{profile?.bio || "No bio yet"}</p>
        </div>

        <div className="mt-4 flex gap-6">
          {[
            { label: "Posts", value: userPosts.length },
            { label: "Followers", value: followersCount },
            { label: "Following", value: followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <span className="block text-lg font-bold text-foreground">{value >= 1000 ? (value / 1000).toFixed(1) + "K" : value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => navigate("/edit-profile")} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow">Edit Profile</button>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-border">Share Profile</button>
        </div>
      </div>

      <div className="mt-6 flex border-b border-border">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => id === "studio" ? navigate("/creator-studio") : setActiveTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${activeTab === id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "reels" ? (
          userReels.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No reels yet</p>
              <button onClick={() => navigate("/reels/create")} className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow">
                Create your first reel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {userReels.map((reel: any) => (
                <button
                  key={reel.id}
                  onClick={() => navigate("/reels")}
                  className="group relative aspect-[9/16] overflow-hidden bg-secondary"
                >
                  <video
                    src={reel.video_url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute right-1 top-1 rounded-full bg-black/50 p-1 backdrop-blur-sm">
                    <Play className="h-3 w-3 fill-white text-white" />
                  </div>
                  <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                    <Eye className="h-3 w-3 text-white drop-shadow-md" />
                    <span className="text-[10px] font-semibold text-white drop-shadow-md">
                      {reel.views_count >= 1000 ? (reel.views_count / 1000).toFixed(1) + "K" : reel.views_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : activeTab !== "studio" && (
          activePosts.length === 0 ? (
            <div className="py-12 text-center"><p className="text-sm text-muted-foreground">No {activeTab} posts</p></div>
          ) : (
            <div className="divide-y divide-border">{activePosts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          )
        )}
      </div>
    </div>
  );
};

export default Profile;
