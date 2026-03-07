import { ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Bookmark, BarChart3, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CreatorStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["creator-stats", user?.id],
    queryFn: async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("likes_count, comments_count, reposts_count, saves_count")
        .eq("user_id", user!.id);

      if (!posts) return { posts: 0, likes: 0, comments: 0, reposts: 0, saves: 0 };

      return {
        posts: posts.length,
        likes: posts.reduce((sum, p) => sum + p.likes_count, 0),
        comments: posts.reduce((sum, p) => sum + p.comments_count, 0),
        reposts: posts.reduce((sum, p) => sum + p.reposts_count, 0),
        saves: posts.reduce((sum, p) => sum + p.saves_count, 0),
      };
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const statCards = [
    { label: "Total Posts", value: stats?.posts || 0, icon: BarChart3, color: "text-primary" },
    { label: "Total Likes", value: stats?.likes || 0, icon: Heart, color: "text-destructive" },
    { label: "Comments", value: stats?.comments || 0, icon: MessageCircle, color: "text-primary" },
    { label: "Saves", value: stats?.saves || 0, icon: Bookmark, color: "text-accent" },
    { label: "Followers", value: profile?.followers_count || 0, icon: Eye, color: "text-primary" },
    { label: "Reposts", value: stats?.reposts || 0, icon: TrendingUp, color: "text-primary" },
  ];

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Creator Studio</h1>
      </div>

      <div className="px-4 py-4">
        {/* Overview */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-foreground">Your Dashboard</h2>
          </div>
          <p className="text-sm text-muted-foreground">Track your engagement metrics and grow your audience on Muslim Community.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">
                {value >= 1000 ? (value / 1000).toFixed(1) + "K" : value}
              </span>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold text-foreground mb-3">Growth Tips</h3>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Post consistently to keep your audience engaged
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Use relevant hashtags like #IslamicReminders
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Engage with your community by replying to comments
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Share quality content with images and videos
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreatorStudio;
