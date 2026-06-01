import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Trash2, Ban, Play } from "lucide-react";
import { Btn, Pill, Spinner } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

export default function AdminReels() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"all"|"hidden"|"restricted">("all");
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ["adm-reels", tab],
    queryFn: async () => {
      let q = supabase.from("reels").select("*").order("created_at", { ascending: false }).limit(60);
      if (tab === "hidden") q = q.eq("hidden", true);
      if (tab === "restricted") q = q.eq("restricted", true);
      const { data } = await q;
      return data || [];
    },
  });
  const update = async (id: string, patch: any, msg: string) => {
    await supabase.from("reels").update(patch).eq("id", id);
    toast({ title: msg });
    qc.invalidateQueries({ queryKey: ["adm-reels"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    await supabase.from("reels").delete().eq("id", id);
    toast({ title: "Reel deleted" });
    qc.invalidateQueries({ queryKey: ["adm-reels"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["all","hidden","restricted"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${tab===t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {reels.map((r: any) => (
            <div key={r.id} className={`overflow-hidden rounded-xl border border-border bg-card ${r.hidden ? "opacity-60" : ""}`}>
              <div className="relative aspect-[9/16] bg-black">
                <video src={r.video_url} className="h-full w-full object-cover" muted preload="metadata" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  <Play className="h-3 w-3 fill-white" />{r.views_count || 0}
                </div>
                {r.hidden && <div className="absolute top-1 left-1"><Pill tone="warn">hidden</Pill></div>}
                {r.restricted && <div className="absolute top-1 right-1"><Pill tone="bad">restricted</Pill></div>}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-[11px]">{r.caption || "—"}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">♥ {r.likes_count} · 💬 {r.comments_count}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Btn onClick={() => update(r.id, { hidden: !r.hidden }, r.hidden ? "Unhidden" : "Hidden")}>{r.hidden ? <Eye className="h-3 w-3"/> : <EyeOff className="h-3 w-3"/>}</Btn>
                  <Btn variant="accent" onClick={() => update(r.id, { restricted: !r.restricted }, r.restricted ? "Unrestricted" : "Restricted")}><Ban className="h-3 w-3"/></Btn>
                  <Btn variant="danger" onClick={() => del(r.id)}><Trash2 className="h-3 w-3"/></Btn>
                </div>
              </div>
            </div>
          ))}
          {!reels.length && <p className="col-span-full py-8 text-center text-xs text-muted-foreground">No reels.</p>}
        </div>
      )}
    </div>
  );
}
