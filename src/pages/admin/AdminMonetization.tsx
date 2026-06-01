import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, TrendingUp, Save } from "lucide-react";
import { StatCard, Section, Spinner, Btn, MiniBars } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Mon = { ads_enabled: boolean; ad_frequency: number; subscription_price: number; subscription_enabled: boolean };
const DEFAULTS: Mon = { ads_enabled: false, ad_frequency: 5, subscription_price: 4.99, subscription_enabled: false };

export default function AdminMonetization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [m, setM] = useState<Mon>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ["adm-mon"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("key","monetization").maybeSingle()).data,
  });
  useEffect(()=>{ if (data?.value) setM({...DEFAULTS, ...(data.value as any)}); }, [data]);

  const save = async () => {
    await supabase.from("app_settings").upsert({ key: "monetization", value: m as any, updated_by: user?.id, updated_at: new Date().toISOString() });
    toast({ title: "Monetization saved" });
  };

  // simulated revenue
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rev = months.map((_,i) => Math.round((i+1)*120 + Math.random()*200));

  if (isLoading) return <Spinner/>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="MRR (est.)" value={`$${(rev.at(-1) || 0).toLocaleString()}`} icon={DollarSign} accent="text-accent"/>
        <StatCard label="Subscribers" value="—" icon={Users}/>
        <StatCard label="Growth" value="+12%" icon={TrendingUp}/>
      </div>
      <Section title="Revenue (12 months)"><MiniBars data={rev} height={90}/></Section>

      <Section title="Ad control">
        <Toggle label="Ads enabled" v={m.ads_enabled} on={v=>setM({...m, ads_enabled:v})}/>
        <div className="mt-2">
          <label className="text-[10px] uppercase text-muted-foreground">Show ad every N posts</label>
          <input type="number" min={1} max={20} value={m.ad_frequency} onChange={e=>setM({...m, ad_frequency:+e.target.value})} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
        </div>
      </Section>

      <Section title="Subscription">
        <Toggle label="Premium tier enabled" v={m.subscription_enabled} on={v=>setM({...m, subscription_enabled:v})}/>
        <div className="mt-2">
          <label className="text-[10px] uppercase text-muted-foreground">Monthly price (USD)</label>
          <input type="number" step="0.01" value={m.subscription_price} onChange={e=>setM({...m, subscription_price:+e.target.value})} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none"/>
        </div>
      </Section>

      <div className="flex justify-end"><Btn variant="primary" onClick={save}><Save className="h-3.5 w-3.5"/>Save</Btn></div>
    </div>
  );
}

const Toggle = ({ label, v, on }: any) => (
  <div className="flex items-center justify-between">
    <p className="text-sm font-medium">{label}</p>
    <button onClick={()=>on(!v)} className={`relative h-5 w-9 rounded-full transition-colors ${v?"bg-primary":"bg-secondary"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${v?"left-4":"left-0.5"}`}/>
    </button>
  </div>
);
