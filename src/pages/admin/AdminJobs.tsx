import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Trash2, Briefcase, Users } from "lucide-react";
import { Btn, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

type Tab = "pending"|"approved"|"rejected";

export default function AdminJobs() {
  const [tab, setTab] = useState<Tab>("pending");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["adm-jobs", tab],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });
  const setStatus = async (id: string, status: string) => {
    await supabase.from("jobs").update({ status }).eq("id", id);
    toast({ title: `Job ${status}` });
    qc.invalidateQueries({ queryKey: ["adm-jobs"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-jobs"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending","approved","rejected"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${tab===t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {jobs.map((j: any) => (
            <div key={j.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><Briefcase className="h-5 w-5"/></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{j.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{j.company || "—"} · {j.location || "Remote"} · {j.job_type}</p>
                  <p className="mt-1 text-xs line-clamp-2 text-muted-foreground">{j.description}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {j.applicants_count} applicants
                    <Pill tone={j.status==='approved'?'ok':j.status==='rejected'?'bad':'warn'}>{j.status}</Pill>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {j.status !== "approved" && <Btn variant="primary" onClick={() => setStatus(j.id, "approved")}><Check className="h-3.5 w-3.5"/>Approve</Btn>}
                {j.status !== "rejected" && <Btn variant="accent" onClick={() => setStatus(j.id, "rejected")}><X className="h-3.5 w-3.5"/>Reject</Btn>}
                <Btn variant="danger" onClick={() => del(j.id)}><Trash2 className="h-3.5 w-3.5"/>Remove</Btn>
              </div>
            </div>
          ))}
          {!jobs.length && <p className="py-8 text-center text-xs text-muted-foreground">No {tab} jobs.</p>}
        </div>
      )}
    </div>
  );
}
