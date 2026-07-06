import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Heart, MessageCircle, UserPlus, MessageSquare, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Prefs = { likes: boolean; comments: boolean; follows: boolean; messages: boolean; jobs: boolean };
const DEFAULT: Prefs = { likes: true, comments: true, follows: true, messages: true, jobs: true };

const rows: { key: keyof Prefs; label: string; desc: string; icon: any }[] = [
  { key: "likes", label: "Likes", desc: "When someone likes your post or reel.", icon: Heart },
  { key: "comments", label: "Comments", desc: "New comments on your content.", icon: MessageCircle },
  { key: "follows", label: "New followers", desc: "When someone starts following you.", icon: UserPlus },
  { key: "messages", label: "Messages", desc: "Direct messages from other members.", icon: MessageSquare },
  { key: "jobs", label: "Jobs", desc: "Job applications and status updates.", icon: Briefcase },
];

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("notif_prefs").eq("user_id", user.id).maybeSingle();
      setPrefs({ ...DEFAULT, ...((data?.notif_prefs as any) || {}) });
      setLoading(false);
    })();
  }, [user]);

  const toggle = async (k: keyof Prefs) => {
    if (!user) return;
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    await supabase.from("profiles").update({ notif_prefs: next as any }).eq("user_id", user.id);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-base font-semibold text-foreground">Notifications</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="px-4 py-4">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {rows.map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3"><Icon className="h-5 w-5 mt-0.5 text-muted-foreground"/><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div></div>
                <button
                  onClick={() => toggle(key)}
                  aria-label={prefs[key] ? "On" : "Off"}
                  className={`relative h-6 w-11 rounded-full transition-colors ${prefs[key] ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;