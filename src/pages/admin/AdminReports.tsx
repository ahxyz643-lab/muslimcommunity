import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Flag } from "lucide-react";
import { Btn, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Status = "pending"|"resolved"|"dismissed"|"all";

export default function AdminReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
  const [type, setType] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["adm-reports", status, type],
    queryFn: async () => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
      if (status !== "all") q = q.eq("status", status);
      if (type !== "all") q = q.eq("target_type", type);
      const { data } = await q;
      return data || [];
    },
  });

  const resolve = async (id: string, newStatus: "resolved"|"dismissed") => {
    await supabase.from("reports").update({ status: newStatus, resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq("id", id);
    toast({ title: `Report ${newStatus}` });
    qc.invalidateQueries({ queryKey: ["adm-reports"] });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto">
          {(["pending","resolved","dismissed","all"] as Status[]).map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold capitalize ${status===s?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["all","post","reel","comment","chat","user"].map(t => (
            <button key={t} onClick={() => setType(t)} className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] capitalize ${type===t?"bg-accent/30 text-accent":"bg-secondary text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>
      {isLoading ? <Spinner /> : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {data.map((r: any) => (
            <li key={r.id} className="p-3">
              <div className="flex items-start gap-2">
                <Flag className={`h-4 w-4 mt-0.5 ${r.status==='pending'?'text-destructive':'text-muted-foreground'}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{r.reason}</p>
                  {r.details && <p className="text-xs text-muted-foreground line-clamp-2">{r.details}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Pill>{r.target_type}</Pill>
                    <span>{r.target_id.slice(0,8)}…</span>
                    {r.ai_flag && <Pill tone="bad">AI</Pill>}
                    <Pill tone={r.status==='pending'?'warn':r.status==='resolved'?'ok':'muted'}>{r.status}</Pill>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {r.status === "pending" && (
                <div className="mt-2 flex gap-1.5 pl-6">
                  <Btn variant="primary" onClick={() => resolve(r.id, "resolved")}><Check className="h-3.5 w-3.5"/>Resolve</Btn>
                  <Btn onClick={() => resolve(r.id, "dismissed")}><X className="h-3.5 w-3.5"/>Dismiss</Btn>
                </div>
              )}
            </li>
          ))}
          {!data.length && <p className="p-6 text-center text-xs text-muted-foreground">No reports.</p>}
        </ul>
      )}
    </div>
  );
}
