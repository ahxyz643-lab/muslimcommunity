import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, Calendar, Users, Trash2, Megaphone } from "lucide-react";
import { Btn, Section, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all"|"verified"|"targeted">("all");
  const [usernames, setUsernames] = useState("");
  const [schedule, setSchedule] = useState("");
  const [sending, setSending] = useState(false);

  const { data: scheduled = [] } = useQuery({
    queryKey: ["adm-scheduled-notifs"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_notifications").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const send = async () => {
    if (!title.trim() || !user) return;
    setSending(true);
    try {
      let userIds: string[] = [];
      if (target === "targeted" && usernames) {
        const names = usernames.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean);
        const { data } = await supabase.from("profiles").select("user_id").in("username", names);
        userIds = (data || []).map(p => p.user_id);
      } else if (target === "verified") {
        const { data } = await supabase.from("profiles").select("user_id").eq("verified", true);
        userIds = (data || []).map(p => p.user_id);
      } else {
        const { data } = await supabase.from("profiles").select("user_id").limit(1000);
        userIds = (data || []).map(p => p.user_id);
      }
      if (schedule) {
        await supabase.from("scheduled_notifications").insert({ title, body, target, target_user_ids: userIds, scheduled_for: new Date(schedule).toISOString(), created_by: user.id });
        toast({ title: "Scheduled ✅" });
      } else {
        const rows = userIds.map(uid => ({ user_id: uid, type: "broadcast", title, body }));
        // batch in chunks
        for (let i = 0; i < rows.length; i += 100) {
          await supabase.from("notifications").insert(rows.slice(i, i+100));
        }
        toast({ title: `Sent to ${userIds.length} users` });
      }
      setTitle(""); setBody(""); setUsernames(""); setSchedule("");
      qc.invalidateQueries({ queryKey: ["adm-scheduled-notifs"] });
    } finally { setSending(false); }
  };

  const del = async (id: string) => {
    await supabase.from("scheduled_notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-scheduled-notifs"] });
  };

  return (
    <div className="space-y-4">
      <Section title="Send notification">
        <div className="space-y-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none" />
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Body (optional)" rows={3} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none resize-none" />
          <div className="flex gap-2">
            {([["all",Megaphone],["verified",Users],["targeted",Users]] as const).map(([t, Icon]) => (
              <button key={t} onClick={()=>setTarget(t as any)} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${target===t?"bg-primary text-primary-foreground":"bg-secondary text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5"/>{t}
              </button>
            ))}
          </div>
          {target === "targeted" && (
            <input value={usernames} onChange={e=>setUsernames(e.target.value)} placeholder="@username1, @username2" className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none" />
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)} className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none" />
          </div>
          <Btn variant="primary" disabled={sending || !title.trim()} onClick={send}><Send className="h-3.5 w-3.5"/>{schedule ? "Schedule" : "Send now"}</Btn>
        </div>
      </Section>

      <Section title="Scheduled queue">
        {scheduled.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No scheduled notifications.</p> : (
          <ul className="divide-y divide-border">
            {scheduled.map((n: any) => (
              <li key={n.id} className="flex items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(n.scheduled_for).toLocaleString()} · {n.target}</p>
                  <Pill tone={n.sent?"ok":"warn"}>{n.sent?"sent":"queued"}</Pill>
                </div>
                <Btn variant="danger" onClick={()=>del(n.id)}><Trash2 className="h-3.5 w-3.5"/></Btn>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
