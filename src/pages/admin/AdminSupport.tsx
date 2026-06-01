import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, Reply, X } from "lucide-react";
import { Btn, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "open"|"resolved"|"dismissed";

export default function AdminSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("open");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["adm-tickets", tab],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(80);
      return data || [];
    },
  });

  const update = async (id: string, patch: any) => {
    await supabase.from("support_tickets").update({ ...patch, assigned_to: user?.id }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-tickets"] });
  };

  const send = async (t: any) => {
    if (!reply.trim()) return;
    await update(t.id, { response: reply, status: "resolved" });
    await supabase.from("notifications").insert({ user_id: t.user_id, type: "support_reply", title: `Re: ${t.subject}`, body: reply });
    toast({ title: "Reply sent" });
    setReplyId(null); setReply("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["open","resolved","dismissed"] as Tab[]).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${tab===t?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {isLoading ? <Spinner/> : (
        <div className="space-y-2">
          {data.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{t.message}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Pill tone={t.priority==='high'?'bad':t.priority==='low'?'muted':'warn'}>{t.priority}</Pill>
                    <Pill tone={t.status==='resolved'?'ok':t.status==='dismissed'?'muted':'info'}>{t.status}</Pill>
                    <span>{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  {t.response && <p className="mt-2 rounded bg-primary/10 p-2 text-xs">Reply: {t.response}</p>}
                </div>
              </div>
              {replyId === t.id ? (
                <div className="mt-2 space-y-2">
                  <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder="Write reply..." className="w-full resize-none rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
                  <div className="flex gap-1.5">
                    <Btn variant="primary" onClick={()=>send(t)}><Reply className="h-3 w-3"/>Send & resolve</Btn>
                    <Btn onClick={()=>setReplyId(null)}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tab === "open" && <Btn variant="primary" onClick={()=>{ setReplyId(t.id); setReply(""); }}><Reply className="h-3.5 w-3.5"/>Reply</Btn>}
                  {tab !== "resolved" && <Btn onClick={()=>update(t.id, { status: "resolved" })}><Check className="h-3.5 w-3.5"/>Resolve</Btn>}
                  {tab !== "dismissed" && <Btn variant="danger" onClick={()=>update(t.id, { status: "dismissed" })}><X className="h-3.5 w-3.5"/>Dismiss</Btn>}
                </div>
              )}
            </div>
          ))}
          {!data.length && <p className="py-8 text-center text-xs text-muted-foreground">No {tab} tickets.</p>}
        </div>
      )}
    </div>
  );
}
