import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Heart, Users, MessageSquare } from "lucide-react";
import { StatCard, Section, Spinner, MiniBars } from "@/components/admin/ui";

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["adm-analytics"],
    queryFn: async () => {
      const [profiles, posts, likes, comments] = await Promise.all([
        supabase.from("profiles").select("created_at, followers_count, display_name, avatar_url, username").order("created_at", { ascending: false }).limit(300),
        supabase.from("posts").select("created_at, likes_count, comments_count, content, image_url").order("likes_count", { ascending: false }).limit(10),
        supabase.from("likes").select("created_at").limit(1000),
        supabase.from("comments").select("created_at").limit(1000),
      ]);
      const growth = Array.from({length: 30}, () => 0);
      const now = Date.now();
      (profiles.data || []).forEach(p => {
        const d = Math.floor((now - new Date(p.created_at).getTime())/864e5);
        if (d>=0 && d<30) growth[29-d]++;
      });
      const eng = Array.from({length: 14}, () => 0);
      [...(likes.data||[]), ...(comments.data||[])].forEach(r => {
        const d = Math.floor((now - new Date(r.created_at).getTime())/864e5);
        if (d>=0 && d<14) eng[13-d]++;
      });
      const topUsers = [...(profiles.data||[])].sort((a:any,b:any) => (b.followers_count||0)-(a.followers_count||0)).slice(0,5);
      return { growth, eng, topUsers, topPosts: posts.data || [], totalLikes: likes.data?.length||0, totalComments: comments.data?.length||0 };
    },
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="30d Signups" value={data.growth.reduce((a,b)=>a+b,0)} icon={Users} />
        <StatCard label="14d Engagement" value={data.eng.reduce((a,b)=>a+b,0)} icon={TrendingUp} />
        <StatCard label="Likes" value={data.totalLikes} icon={Heart} />
        <StatCard label="Comments" value={data.totalComments} icon={MessageSquare} />
      </div>
      <Section title="User growth (30 days)"><MiniBars data={data.growth} height={90} /></Section>
      <Section title="Engagement (14 days)"><MiniBars data={data.eng} height={90} /></Section>
      <Section title="Most active users (by followers)">
        <ul className="divide-y divide-border">
          {data.topUsers.map((u: any) => (
            <li key={u.username} className="flex items-center gap-3 py-2">
              <img src={u.avatar_url || "https://i.pravatar.cc/150"} className="h-8 w-8 rounded-full" />
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{u.display_name}</p><p className="text-[11px] text-muted-foreground">@{u.username}</p></div>
              <span className="text-xs font-bold text-primary">{u.followers_count} followers</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Top posts">
        <ul className="divide-y divide-border">
          {data.topPosts.map((p: any) => (
            <li key={p.created_at + p.content?.slice(0,5)} className="flex items-start gap-3 py-2">
              {p.image_url && <img src={p.image_url} className="h-10 w-10 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs line-clamp-2">{p.content}</p>
                <p className="text-[10px] text-muted-foreground">♥ {p.likes_count} · 💬 {p.comments_count}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
