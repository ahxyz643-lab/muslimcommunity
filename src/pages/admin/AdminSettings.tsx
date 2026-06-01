import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Globe, Lock, FileText, RefreshCw } from "lucide-react";
import { Btn, Section, Spinner } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Settings = {
  app_name: string;
  tagline: string;
  signups_open: boolean;
  private_mode: boolean;
  content_rules: string;
  update_policy: string;
};

const DEFAULTS: Settings = {
  app_name: "Muslim Community",
  tagline: "Connect with the Ummah",
  signups_open: true,
  private_mode: false,
  content_rules: "Be respectful. No hate speech, harassment, or NSFW content.",
  update_policy: "We notify users in-app before policy changes.",
};

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adm-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("key", "general").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data?.value) setS({ ...DEFAULTS, ...(data.value as any) });
  }, [data]);

  const save = async () => {
    setSaving(true);
    await supabase.from("app_settings").upsert({ key: "general", value: s as any, updated_by: user?.id, updated_at: new Date().toISOString() });
    toast({ title: "Settings saved" });
    setSaving(false);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <Section title="App identity">
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-muted-foreground">App name</label>
          <input value={s.app_name} onChange={e=>setS({...s, app_name:e.target.value})} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
          <label className="text-[10px] uppercase text-muted-foreground">Tagline</label>
          <input value={s.tagline} onChange={e=>setS({...s, tagline:e.target.value})} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
        </div>
      </Section>
      <Section title="Privacy & access">
        <Toggle icon={Globe} label="Signups open" desc="Allow new users to register" v={s.signups_open} on={v=>setS({...s, signups_open:v})}/>
        <Toggle icon={Lock} label="Private mode" desc="Require login to view content" v={s.private_mode} on={v=>setS({...s, private_mode:v})}/>
      </Section>
      <Section title="Content rules">
        <textarea value={s.content_rules} onChange={e=>setS({...s, content_rules:e.target.value})} rows={4} className="w-full resize-none rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
      </Section>
      <Section title="Update policy">
        <textarea value={s.update_policy} onChange={e=>setS({...s, update_policy:e.target.value})} rows={3} className="w-full resize-none rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
      </Section>
      <div className="flex justify-end"><Btn variant="primary" onClick={save} disabled={saving}>{saving?<RefreshCw className="h-3.5 w-3.5 animate-spin"/>:<Save className="h-3.5 w-3.5"/>}Save settings</Btn></div>
    </div>
  );
}

const Toggle = ({ icon:Icon, label, desc, v, on }: any) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-start gap-2"><Icon className="h-4 w-4 mt-0.5 text-muted-foreground"/><div><p className="text-sm font-medium">{label}</p><p className="text-[10px] text-muted-foreground">{desc}</p></div></div>
    <button onClick={()=>on(!v)} className={`relative h-5 w-9 rounded-full transition-colors ${v?"bg-primary":"bg-secondary"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${v?"left-4":"left-0.5"}`}/>
    </button>
  </div>
);
