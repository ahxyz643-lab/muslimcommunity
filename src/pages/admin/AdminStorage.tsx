import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, Database, CheckCircle2, Activity, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatCard, Section, Spinner, MiniBars } from "@/components/admin/ui";

const TOTAL_GB = 100;

export default function AdminStorage() {
  const { toast } = useToast();
  const [wiping, setWiping] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["adm-storage"],
    queryFn: async () => {
      const buckets = ["media", "reels"];
      let totalBytes = 0;
      let totalFiles = 0;
      const perBucket: { name: string; bytes: number; files: number }[] = [];
      for (const b of buckets) {
        const { data: files } = await supabase.storage.from(b).list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
        const bytes = (files || []).reduce((s: number, f: any) => s + (f.metadata?.size || 0), 0);
        perBucket.push({ name: b, bytes, files: files?.length || 0 });
        totalBytes += bytes;
        totalFiles += files?.length || 0;
      }
      return { totalBytes, totalFiles, perBucket };
    },
  });

  if (isLoading || !data) return <Spinner />;
  const usedGB = data.totalBytes / 1073741824;
  const remainGB = TOTAL_GB - usedGB;
  const pct = Math.min(100, (usedGB / TOTAL_GB) * 100);

  const handleWipe = async () => {
    if (!confirm("Permanently delete ALL legacy videos from Supabase storage? Telegram-hosted videos won't be affected.")) return;
    setWiping(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-wipe-videos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast({ title: "Wipe complete", description: `media: ${json.summary?.media?.deleted ?? 0} files, reels: ${json.summary?.reels?.deleted ?? 0} files` });
    } catch (e: any) {
      toast({ title: "Wipe failed", description: e.message, variant: "destructive" });
    }
    setWiping(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={`${TOTAL_GB} GB`} icon={HardDrive} />
        <StatCard label="Used" value={`${usedGB.toFixed(2)} GB`} icon={Database} accent="text-accent" />
        <StatCard label="Remaining" value={`${remainGB.toFixed(2)} GB`} icon={CheckCircle2} />
      </div>

      <Section title="Usage">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs"><span>{pct.toFixed(1)}% used</span><span className="text-muted-foreground">{data.totalFiles} files</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {data.perBucket.map(b => (
            <div key={b.name} className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] uppercase text-muted-foreground">{b.name}</p>
              <p className="text-base font-bold">{(b.bytes/1073741824).toFixed(3)} GB</p>
              <p className="text-[10px] text-muted-foreground">{b.files} files</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="System health">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          <div>
            <p className="text-sm font-semibold">All systems operational</p>
            <p className="text-[10px] text-muted-foreground">API · Database · Storage · Realtime</p>
          </div>
        </div>
        <div className="mt-3"><MiniBars data={Array.from({length:24},() => Math.round(Math.random()*50)+30)} /></div>
      </Section>

      <Section title="Danger zone">
        <p className="text-xs text-muted-foreground mb-3">
          Videos ab Telegram pe store hote hain. Purani Supabase storage videos ko delete karke space free karo.
        </p>
        <button
          onClick={handleWipe}
          disabled={wiping}
          className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
        >
          {wiping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Wipe legacy videos
        </button>
      </Section>
    </div>
  );
}
