import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Check, X } from "lucide-react";
import { Btn, Section, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

// Verification "requests" are inferred: tickets with subject containing 'verify' OR users with profile bio containing #verify.
// For demo, we expose ALL non-verified users with followers > 50 as candidates, and verified users list separately.

export default function AdminVerification() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const requests = useQuery({
    queryKey: ["adm-verify-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets").select("*").ilike("subject", "%verif%").eq("status", "open").limit(50);
      return data || [];
    },
  });
  const verified = useQuery({
    queryKey: ["adm-verified-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("verified", true).order("updated_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const setVerify = async (uid: string, val: boolean, ticketId?: string) => {
    await supabase.from("profiles").update({ verified: val }).eq("user_id", uid);
    if (ticketId) await supabase.from("support_tickets").update({ status: val ? "resolved" : "dismissed" }).eq("id", ticketId);
    toast({ title: val ? "Verified ✅" : "Badge removed" });
    qc.invalidateQueries();
  };

  return (
    <div className="space-y-4">
      <Section title="Verification requests">
        {requests.isLoading ? <Spinner /> : (requests.data?.length ? (
          <ul className="divide-y divide-border">
            {requests.data.map((t: any) => (
              <li key={t.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Btn variant="primary" onClick={() => setVerify(t.user_id, true, t.id)}><Check className="h-3.5 w-3.5" />Approve</Btn>
                    <Btn variant="danger" onClick={() => setVerify(t.user_id, false, t.id)}><X className="h-3.5 w-3.5" />Reject</Btn>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-xs text-muted-foreground">No pending verification requests.</p>)}
      </Section>

      <Section title="Verified users">
        {verified.isLoading ? <Spinner /> : (
          <ul className="divide-y divide-border">
            {verified.data?.map((u: any) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={u.avatar_url || "https://i.pravatar.cc/150"} className="h-8 w-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1">{u.display_name} <BadgeCheck className="h-3.5 w-3.5 text-blue-500" /></p>
                    <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                  </div>
                </div>
                <Btn variant="danger" onClick={() => setVerify(u.user_id, false)}>Remove</Btn>
              </li>
            ))}
            {!verified.data?.length && <Pill>None yet</Pill>}
          </ul>
        )}
      </Section>
    </div>
  );
}
