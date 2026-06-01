import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Flag, BadgeCheck, HandHeart } from "lucide-react";
import { Btn, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

type Kind = "all"|"donor"|"receiver";

export default function AdminDonations() {
  const [kind, setKind] = useState<Kind>("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery({
    queryKey: ["adm-donations", kind],
    queryFn: async () => {
      let q = supabase.from("donations").select("*").order("created_at", { ascending: false }).limit(60);
      if (kind !== "all") q = q.eq("kind", kind);
      const { data } = await q;
      return data || [];
    },
  });

  const upd = async (id: string, patch: any, msg: string) => {
    await supabase.from("donations").update(patch).eq("id", id);
    toast({ title: msg });
    qc.invalidateQueries({ queryKey: ["adm-donations"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["all","donor","receiver"] as Kind[]).map(k => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${kind===k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{k}</button>
        ))}
      </div>
      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {data.map((d: any) => (
            <div key={d.id} className={`rounded-xl border border-border bg-card p-3 ${d.flagged ? "border-destructive/50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${d.kind==='donor'?'bg-primary/15 text-primary':'bg-accent/20 text-accent'}`}>
                  <HandHeart className="h-5 w-5"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{d.description || "—"}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={d.kind==='donor'?'ok':'info'}>{d.kind}</Pill>
                    {d.amount && <Pill>{d.currency} {d.amount}</Pill>}
                    <Pill tone={d.status==='approved'?'ok':d.status==='rejected'?'bad':'warn'}>{d.status}</Pill>
                    {d.verified && <Pill tone="info"><BadgeCheck className="mr-1 h-3 w-3 inline"/>verified</Pill>}
                    {d.flagged && <Pill tone="bad">flagged</Pill>}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn variant="primary" onClick={() => upd(d.id, { status: "approved" }, "Approved")}><Check className="h-3.5 w-3.5"/>Approve</Btn>
                <Btn variant="accent" onClick={() => upd(d.id, { status: "rejected" }, "Rejected")}><X className="h-3.5 w-3.5"/>Reject</Btn>
                <Btn onClick={() => upd(d.id, { verified: !d.verified }, d.verified ? "Unverified" : "Marked verified")}><BadgeCheck className="h-3.5 w-3.5"/>{d.verified ? "Unverify" : "Mark verified"}</Btn>
                <Btn variant="danger" onClick={() => upd(d.id, { flagged: !d.flagged }, d.flagged ? "Unflagged" : "Flagged")}><Flag className="h-3.5 w-3.5"/>{d.flagged ? "Unflag" : "Flag"}</Btn>
              </div>
            </div>
          ))}
          {!data.length && <p className="py-8 text-center text-xs text-muted-foreground">No donations.</p>}
        </div>
      )}
    </div>
  );
}
