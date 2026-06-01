import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, UserX, AlertCircle } from "lucide-react";
import { Btn, Spinner, Section, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

export default function AdminChats() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const flagged = useQuery({
    queryKey: ["adm-chat-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").eq("target_type", "chat").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });
  const block = async (uid: string) => {
    await supabase.from("profiles").update({ banned: true }).eq("user_id", uid);
    toast({ title: "User blocked" });
    qc.invalidateQueries();
  };
  const warn = async (uid: string) => {
    await supabase.from("notifications").insert({ user_id: uid, type: "warning", title: "Community warning", body: "Your chat behaviour was flagged. Please follow our community rules." });
    toast({ title: "Warning sent" });
  };
  const resolve = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-chat-reports"] });
  };

  return (
    <div className="space-y-3">
      <Section title="Reported conversations">
        {flagged.isLoading ? <Spinner /> : (flagged.data?.length ? (
          <ul className="divide-y divide-border">
            {flagged.data.map((r: any) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{r.reason}</p>
                    {r.details && <p className="text-xs text-muted-foreground line-clamp-2">{r.details}</p>}
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>conv: {r.target_id.slice(0,8)}…</span>
                      {r.ai_flag && <Pill tone="bad">AI</Pill>}
                      <Pill tone={r.status==='pending'?'warn':'ok'}>{r.status}</Pill>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                  <Btn variant="accent" onClick={() => warn(r.reporter_id)}><AlertTriangle className="h-3.5 w-3.5"/>Warn</Btn>
                  <Btn variant="danger" onClick={() => block(r.reporter_id)}><UserX className="h-3.5 w-3.5"/>Block user</Btn>
                  <Btn onClick={() => resolve(r.id)}>Resolve</Btn>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-xs text-muted-foreground">No reported chats — all clear.</p>)}
      </Section>
    </div>
  );
}
