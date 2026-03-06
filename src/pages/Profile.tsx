import { Settings, Grid3X3, Bookmark, Heart, BarChart3, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard, { PostWithProfile } from "@/components/PostCard";
import heroPattern from "@/assets/hero-pattern.jpg";

const Profile = () => {
  const { user, signOut } = useAuth();
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
      const postIds = saves.map((s) => s.post_id);
      return fetchPostsWithProfiles(
        supabase.from("posts").select("*").in("id", postIds).order("created_at", { ascending: false })
      );
    },
    enabled: !!user && activeTab === "saved",
  });

  const { data: likedPosts = [] } = useQuery({
    queryKey: ["liked-posts", user?.id],
    queryFn: async () => {
      const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user!.id);
      if (!likes || likes.length === 0) return [];
      const postIds = likes.map((l) => l.post_id);
      return fetchPostsWithProfiles(
        supabase.from("posts").select("*").in("id", postIds).order("created_at", { ascending: false })
      );
    },
    enabled: !!user && activeTab === "liked",
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

  return (
    <div className="pb-20">
      <div className="relative h-36">
        <img src={heroPattern} alt="Cover" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute right-3 top-3 flex gap-2">
          <button onClick={signOut} className="rounded-full bg-card/80 p-2 backdrop-blur-sm text-muted-foreground hover:text-destructive" title="Sign Out">
            <LogOut className="h-5 w-5" />
          </button>
          <button className="rounded-full bg-card/80 p-2 backdrop-blur-sm text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative px-4">
        <img src={profile?.avatar_url || "https://i.pravatar.cc/150"} alt={profile?.display_name || ""} className="-mt-12 h-24 w-24 rounded-full border-4 border-card object-cover ring-2 ring-primary" />
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">{profile?.display_name || "User"}</h1>
            {profile?.verified && (
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile?.username || "user"}</p>
          <p className="mt-2 text-sm text-foreground">{profile?.bio || "No bio yet"}</p>
        </div>

        <div className="mt-4 flex gap-6">
          {[
            { label: "Posts", value: userPosts.length },
            { label: "Followers", value: profile?.followers_count || 0 },
            { label: "Following", value: profile?.following_count || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <span className="block text-lg font-bold text-foreground">{value >= 1000 ? (value / 1000).toFixed(1) + "K" : value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow">Edit Profile</button>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-border">Share Profile</button>
        </div>
      </div>

      <div className="mt-6 flex border-b border-border">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${activeTab === id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "posts" && (
          userPosts.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-muted-foreground">No posts yet</p></div>
          : <div className="divide-y divide-border">{userPosts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        )}
        {activeTab === "saved" && (
          savedPosts.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-muted-foreground">No saved posts</p></div>
          : <div className="divide-y divide-border">{savedPosts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        )}
        {activeTab === "liked" && (
          likedPosts.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-muted-foreground">No liked posts</p></div>
          : <div className="divide-y divide-border">{likedPosts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        )}
        {activeTab === "studio" && (
          <div className="p-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gold" />
              <h3 className="font-display text-lg font-semibold text-foreground">Creator Studio</h3>
              <p className="mt-1 text-sm text-muted-foreground">Track your engagement and grow your audience.</p>
              <button className="mt-4 rounded-xl gradient-gold px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-gold transition-all hover:opacity-90">Coming Soon</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
