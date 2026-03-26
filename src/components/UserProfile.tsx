import { useState } from "react";
import { ArrowLeft, MessageCircle, Loader as Loader2, Grid3x3 as Grid3X3, Crown, ShieldCheck, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPostsWithProfiles } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";

const UserProfile = ({ userId }: { userId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwnProfile = user?.id === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      return data;
    },
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["is-following", user?.id, userId],
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user!.id).eq("following_id", userId).maybeSingle();
      return !!data;
    },
    enabled: !!user && !isOwnProfile,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", userId],
    queryFn: () => fetchPostsWithProfiles(
      supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false })
    ),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return data || [];
    },
  });

  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async () => {
    if (!user) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    }
    queryClient.invalidateQueries({ queryKey: ["is-following", user.id, userId] });
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    setFollowLoading(false);
  };

  const handleMessage = async () => {
    navigate("/messages");
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">{profile?.display_name || "User"}</h1>
      </div>

      <div className="px-4 pt-6">
        <div className="flex items-center gap-4">
          <img
            src={profile?.avatar_url || "https://i.pravatar.cc/150"}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-primary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">{profile?.display_name || "User"}</h2>
              {profile?.verified && <VerifiedBadge size="md" />}
              {userRoles.some(r => r.role === "admin") && <Crown className="h-4 w-4 text-amber-500" title="Admin" />}
              {userRoles.some(r => r.role === "moderator") && <ShieldCheck className="h-4 w-4 text-primary" title="Moderator" />}
              {userRoles.some(r => r.role === "scholar") && <BookOpen className="h-4 w-4 text-emerald-500" title="Scholar" />}
            </div>
            <p className="text-sm text-muted-foreground">@{profile?.username || "user"}</p>
          </div>
        </div>

        {profile?.bio && <p className="mt-3 text-sm text-foreground">{profile.bio}</p>}

        <div className="mt-4 flex gap-6">
          <div className="text-center">
            <span className="block text-lg font-bold text-foreground">{posts.length}</span>
            <span className="text-xs text-muted-foreground">Posts</span>
          </div>
          <div className="text-center">
            <span className="block text-lg font-bold text-foreground">{profile?.followers_count || 0}</span>
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
          <div className="text-center">
            <span className="block text-lg font-bold text-foreground">{profile?.following_count || 0}</span>
            <span className="text-xs text-muted-foreground">Following</span>
          </div>
        </div>

        {!isOwnProfile && user && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                isFollowing
                  ? "bg-secondary text-secondary-foreground hover:bg-border"
                  : "gradient-primary text-primary-foreground shadow-glow"
              }`}
            >
              {followLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isFollowing ? "Following" : "Follow"}
            </button>
            <button
              onClick={handleMessage}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border">
        <div className="flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-primary border-b-2 border-primary">
          <Grid3X3 className="h-4 w-4" />Posts
        </div>
        {posts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No posts yet</div>
        ) : (
          <div className="divide-y divide-border">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
