import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Lock, Eye, KeyRound, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Profile = { is_private?: boolean; show_activity?: boolean };

const Toggle = ({ v, onChange }: { v: boolean; onChange: (b: boolean) => void }) => (
  <button
    onClick={() => onChange(!v)}
    aria-label={v ? "On" : "Off"}
    className={`relative h-6 w-11 rounded-full transition-colors ${v ? "bg-primary" : "bg-secondary"}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${v ? "left-[22px]" : "left-0.5"}`} />
  </button>
);

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState("");
  const [blocked, setBlocked] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: b }] = await Promise.all([
        supabase.from("profiles").select("is_private, show_activity").eq("user_id", user.id).maybeSingle(),
        supabase.from("blocks" as any).select("id, blocked_id, created_at").eq("blocker_id", user.id),
      ]);
      setProfile(p || {});
      const rows = ((b as any[]) || []);
      if (rows.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", rows.map((r) => r.blocked_id));
        const map = new Map((profs || []).map((pr) => [pr.user_id, pr]));
        setBlocked(rows.map((r) => ({ ...r, profiles: map.get(r.blocked_id) || null })));
      } else {
        setBlocked([]);
      }
      setLoading(false);
    })();
  }, [user]);

  const patch = async (partial: Profile) => {
    if (!user) return;
    const next = { ...profile, ...partial };
    setProfile(next);
    setSaving(true);
    await supabase.from("profiles").update(partial as any).eq("user_id", user.id);
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwd.length < 6) { toast({ title: "Password too short", description: "Min 6 characters", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setPwd("");
    toast({ title: "Password updated" });
  };

  const unblock = async (id: string) => {
    await supabase.from("blocks" as any).delete().eq("id", id);
    setBlocked((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-base font-semibold text-foreground">Privacy & Security</h1>
        {saving && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 px-4 py-4">
          <section className="rounded-xl border border-border bg-card divide-y divide-border">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3"><Lock className="h-5 w-5 mt-0.5 text-muted-foreground"/><div><p className="text-sm font-semibold">Private account</p><p className="text-xs text-muted-foreground">Only approved followers can see your posts.</p></div></div>
              <Toggle v={!!profile.is_private} onChange={(v) => patch({ is_private: v })} />
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3"><Eye className="h-5 w-5 mt-0.5 text-muted-foreground"/><div><p className="text-sm font-semibold">Show activity status</p><p className="text-xs text-muted-foreground">Let others see when you're online.</p></div></div>
              <Toggle v={profile.show_activity !== false} onChange={(v) => patch({ show_activity: v })} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground"/><h2 className="text-sm font-semibold">Change password</h2></div>
            <div className="flex gap-2">
              <Input type="password" placeholder="New password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="bg-secondary border-border" />
              <Button onClick={changePassword} disabled={!pwd} className="gradient-primary text-primary-foreground">Update</Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2"><UserX className="h-4 w-4 text-muted-foreground"/><h2 className="text-sm font-semibold">Blocked accounts ({blocked.length})</h2></div>
            {blocked.length === 0 ? (
              <p className="text-xs text-muted-foreground">You haven't blocked anyone yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {blocked.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2">
                    <img src={b.profiles?.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-9 w-9 rounded-full object-cover"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.profiles?.display_name || b.profiles?.username || "user"}</p>
                      <p className="text-xs text-muted-foreground truncate">@{b.profiles?.username || "user"}</p>
                    </div>
                    <button onClick={() => unblock(b.id)} className="rounded-full border border-border px-3 py-1 text-xs">Unblock</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default PrivacySettings;