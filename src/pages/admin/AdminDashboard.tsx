import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Clapperboard, Briefcase, HandHeart, Activity, MessageSquare, Flag } from "lucide-react";
import { StatCard, Section, Spinner, MiniBars, Pill } from "@/components/admin/ui";

const countQ = (table: string, filter?: any) => async () => {
  let q = supabase.from(table as any).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
};

export default function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, active, posts, reels, jobs, donations, reports, tickets] = await Promise.all([
        countQ("profiles")(),
        (async () => {
          const since = new Date(Date.now() - 7 * 864e5).toISOString();
          const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", since);
          return count ?? 0;
        })(),
        countQ("posts")(),
        countQ("reels")(),
        countQ("jobs")(),
        countQ("donations")(),
        (async () => { const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status","pending"); return count ?? 0; })(),
        (async () => { const { count } = await supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status","open"); return count ?? 0; })(),
      ]);
      return { users, active, posts, reels, jobs, donations, reports, tickets };
    },
  });

  const growth = useQuery({
    queryKey: ["admin-growth"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(500);
      const buckets = Array.from({ length: 14 }, () => 0);
      const now = Date.now();
      (data || []).forEach(r => {
        const day = Math.floor((now - new Date(r.created_at).getTime()) / 864e5);
        if (day >= 0 && day < 14) buckets[13 - day]++;
      });
      return buckets;
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
  });

  if (stats.isLoading) return <Spinner />;
  const s = stats.data!;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Users" value={s.users} icon={Users} />
        <StatCard label="Active (7d)" value={s.active} icon={Activity} accent="text-accent" />
        <StatCard label="Posts" value={s.posts} icon={FileText} />
        <StatCard label="Reels" value={s.reels} icon={Clapperboard} />
        <StatCard label="Jobs" value={s.jobs} icon={Briefcase} />
        <StatCard label="Donations" value={s.donations} icon={HandHeart} />
        <StatCard label="Open Reports" value={s.reports} icon={Flag} accent="text-destructive" />
        <StatCard label="Open Tickets" value={s.tickets} icon={MessageSquare} />
      </div>

      <Section title="User growth (14 days)">
        {growth.data ? <MiniBars data={growth.data} height={100} /> : <Spinner />}
      </Section>

      <Section title="Recent admin activity">
        {recent.isLoading ? <Spinner /> : (recent.data?.length ? (
          <ul className="divide-y divide-border">
            {recent.data.map((l: any) => (
              <li key={l.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{l.action}</p>
                  <p className="text-[10px] text-muted-foreground">{l.target_type || "—"} · {new Date(l.created_at).toLocaleString()}</p>
                </div>
                <Pill tone="info">log</Pill>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-xs text-muted-foreground">No recent actions yet.</p>)}
      </Section>
    </div>
  );
}
