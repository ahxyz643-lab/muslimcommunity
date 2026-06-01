import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Shield, MessageCircle, Save } from "lucide-react";
import { Section, Spinner, Btn } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type AI = {
  moderation_enabled: boolean;
  auto_hide_threshold: number;
  filter_profanity: boolean;
  filter_violence: boolean;
  filter_nsfw: boolean;
  chatbot_enabled: boolean;
  chatbot_persona: string;
};
const DEFAULTS: AI = {
  moderation_enabled: true, auto_hide_threshold: 0.8,
  filter_profanity: true, filter_violence: true, filter_nsfw: true,
  chatbot_enabled: false, chatbot_persona: "Helpful, respectful, Islamic-friendly assistant.",
};

export default function AdminAI() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [s, setS] = useState<AI>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ["adm-ai"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("key","ai").maybeSingle()).data,
  });
  useEffect(()=>{ if (data?.value) setS({...DEFAULTS, ...(data.value as any)}); }, [data]);

  const save = async () => {
    await supabase.from("app_settings").upsert({ key: "ai", value: s as any, updated_by: user?.id, updated_at: new Date().toISOString() });
    toast({ title: "AI settings saved" });
  };

  if (isLoading) return <Spinner/>;

  return (
    <div className="space-y-4">
      <Section title="Content moderation">
        <Toggle icon={Shield} label="AI moderation enabled" v={s.moderation_enabled} on={v=>setS({...s, moderation_enabled:v})}/>
        <div className="mt-3">
          <label className="text-[10px] uppercase text-muted-foreground">Auto-hide threshold ({Math.round(s.auto_hide_threshold*100)}%)</label>
          <input type="range" min={0.3} max={0.99} step={0.01} value={s.auto_hide_threshold} onChange={e=>setS({...s, auto_hide_threshold:+e.target.value})} className="w-full"/>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1">
          <Toggle label="Filter profanity" v={s.filter_profanity} on={v=>setS({...s, filter_profanity:v})}/>
          <Toggle label="Filter violence" v={s.filter_violence} on={v=>setS({...s, filter_violence:v})}/>
          <Toggle label="Filter NSFW" v={s.filter_nsfw} on={v=>setS({...s, filter_nsfw:v})}/>
        </div>
      </Section>

      <Section title="Chatbot">
        <Toggle icon={MessageCircle} label="Enable AI chatbot" v={s.chatbot_enabled} on={v=>setS({...s, chatbot_enabled:v})}/>
        <textarea value={s.chatbot_persona} onChange={e=>setS({...s, chatbot_persona:e.target.value})} rows={4} className="mt-2 w-full resize-none rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
      </Section>

      <div className="flex justify-end"><Btn variant="primary" onClick={save}><Save className="h-3.5 w-3.5"/>Save</Btn></div>
    </div>
  );
}

const Toggle = ({ icon:Icon, label, v, on }: any) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-muted-foreground"/>}<p className="text-sm font-medium">{label}</p></div>
    <button onClick={()=>on(!v)} className={`relative h-5 w-9 rounded-full transition-colors ${v?"bg-primary":"bg-secondary"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${v?"left-4":"left-0.5"}`}/>
    </button>
  </div>
);
