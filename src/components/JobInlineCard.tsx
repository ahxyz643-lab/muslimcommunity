import { Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function JobInlineCard() {
  const navigate = useNavigate();
  const { data: job } = useQuery({
    queryKey: ["inline-job"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  if (!job) return null;
  return (
    <button onClick={() => navigate("/jobs")} className="block w-full px-4 py-3 text-left">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary"><Briefcase className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Featured Job</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{job.title}</p>
            <p className="text-xs text-muted-foreground truncate">{job.company || "—"} · {job.location || "Remote"}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary mt-1" />
        </div>
      </div>
    </button>
  );
}