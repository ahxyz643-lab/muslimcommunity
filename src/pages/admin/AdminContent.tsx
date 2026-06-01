import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Trash2, Image as Img, Video, Type } from "lucide-react";
import { Btn, Pill, Spinner } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

type Tab = "all" | "image" | "video" | "text" | "hidden";

export default function AdminContent() {
  const [tab, setTab] = useState<Tab>("all");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["adm-posts", tab],
    queryFn: async () => {
      let q = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(60);
      if (tab === "image") q = q.not("image_url", "is", null);
      if (tab === "video") q = q.not("video_url", "is", null);
      if (tab === "text") q = q.is("image_url", null).is("video_url", null);
      if (tab === "hidden") q = q.eq("hidden", true);
      const { data } = await q;
      return data || [];
    },
  });

  const toggleHide = async (id: string, current: boolean) => {
    await supabase.from("posts").update({ hidden: !current }).eq("id", id);
    toast({ title: current ? "Marked safe" : "Hidden from feed" });
    qc.invalidateQueries({ queryKey: ["adm-posts"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("posts").delete().eq("id", id);
    toast({ title: "Post deleted" });
    qc.invalidateQueries({ queryKey: ["adm-posts"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all","image","video","text","hidden"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold capitalize ${tab===t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {posts.map((p: any) => (
            <div key={p.id} className={`rounded-xl border border-border bg-card p-3 ${p.hidden ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                {p.image_url ? <img src={p.image_url} className="h-14 w-14 rounded-lg object-cover" /> :
                  p.video_url ? <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary"><Video className="h-5 w-5" /></div> :
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary"><Type className="h-5 w-5" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium line-clamp-2">{p.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()} · ♥ {p.likes_count} · 💬 {p.comments_count}</p>
                  <div className="mt-2 flex gap-1.5">
                    {p.hidden && <Pill tone="warn">hidden</Pill>}
                    <Btn onClick={() => toggleHide(p.id, p.hidden)}>{p.hidden ? <><Eye className="h-3.5 w-3.5"/>Mark safe</> : <><EyeOff className="h-3.5 w-3.5"/>Hide</>}</Btn>
                    <Btn variant="danger" onClick={() => del(p.id)}><Trash2 className="h-3.5 w-3.5" />Delete</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!posts.length && <p className="py-8 text-center text-xs text-muted-foreground">No posts.</p>}
        </div>
      )}
    </div>
  );
}
