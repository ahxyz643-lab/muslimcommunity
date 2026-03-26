import { Settings as SettingsIcon, Grid3X3, Bookmark, Heart, BarChart3, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import heroPattern from "@/assets/hero-pattern.jpg";

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

  const tabs = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
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
        {activeTab !== "studio" && (
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
