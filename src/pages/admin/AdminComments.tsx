import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle } from "lucide-react";
import { Btn, Spinner, Pill } from "@/components/admin/ui";
import { useToast } from "@/hooks/use-toast";

const ABUSIVE = ["fuck","shit","stupid","idiot","kill","hate"];

export default function AdminComments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["adm-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });
  const reelComments = useQuery({
    queryKey: ["adm-reel-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("reel_comments").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const flag = (text: string) => ABUSIVE.some(w => text.toLowerCase().includes(w));
  const del = async (id: string, table: "comments"|"reel_comments") => {
    await supabase.from(table).delete().eq("id", id);
    toast({ title: "Deleted" });
    qc.invalidateQueries();
  };

  const all = [
    ...comments.map((c: any) => ({ ...c, _table: "comments" as const })),
    ...(reelComments.data || []).map((c: any) => ({ ...c, _table: "reel_comments" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">AI flag highlights potential abuse — review and remove if violating community rules.</p>
      {isLoading ? <Spinner /> : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {all.map((c: any) => {
            const flagged = flag(c.content);
            return (
              <li key={c._table + c.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${flagged ? "text-destructive" : "text-foreground"}`}>{c.content}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{c._table === "comments" ? "Post" : "Reel"} comment</span>
                      <span>· {new Date(c.created_at).toLocaleString()}</span>
                      {flagged && <Pill tone="bad"><AlertTriangle className="mr-1 h-3 w-3 inline"/>AI flag</Pill>}
                    </div>
                  </div>
                  <Btn variant="danger" onClick={() => del(c.id, c._table)}><Trash2 className="h-3.5 w-3.5"/>Delete</Btn>
                </div>
              </li>
            );
          })}
          {!all.length && <p className="p-6 text-center text-xs text-muted-foreground">No comments.</p>}
        </ul>
      )}
    </div>
  );
}
