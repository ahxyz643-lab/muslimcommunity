import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock, AlertTriangle, Activity } from "lucide-react";
import { StatCard, Section, Spinner, Pill } from "@/components/admin/ui";

export default function AdminSecurity() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["adm-security-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const suspicious = logs.filter((l: any) => /delete|ban|revoke|admin/.test(l.action));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Admin actions (recent)" value={logs.length} icon={Activity}/>
        <StatCard label="Sensitive" value={suspicious.length} icon={AlertTriangle} accent="text-destructive"/>
        <StatCard label="Locked accounts" value={"—"} icon={Lock}/>
      </div>

      <Section title="Suspicious activity alerts">
        {suspicious.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">All quiet — no sensitive actions.</p> : (
          <ul className="divide-y divide-border">
            {suspicious.slice(0,10).map((l: any) => (
              <li key={l.id} className="py-2.5">
                <p className="text-sm font-medium text-destructive">{l.action}</p>
                <p className="text-[10px] text-muted-foreground">{l.target_type}: {l.target_id?.slice(0,8)}… · {new Date(l.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Admin access log">
        {isLoading ? <Spinner/> : (
          <ul className="divide-y divide-border">
            {logs.map((l: any) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{l.action}</p>
                  <p className="text-[10px] text-muted-foreground truncate">by {l.admin_id?.slice(0,8)}… · {new Date(l.created_at).toLocaleString()}</p>
                </div>
                <Pill tone="info">{l.target_type || "log"}</Pill>
              </li>
            ))}
            {!logs.length && <p className="py-4 text-center text-xs text-muted-foreground">No log entries yet.</p>}
          </ul>
        )}
      </Section>
    </div>
  );
}
