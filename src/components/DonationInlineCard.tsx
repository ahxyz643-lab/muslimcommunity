import { HandHeart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function DonationInlineCard() {
  const navigate = useNavigate();
  const { data: d } = useQuery({
    queryKey: ["inline-donation"],
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  if (!d) return null;
  return (
    <button onClick={() => navigate("/donations")} className="block w-full px-4 py-3 text-left">
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-primary/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent"><HandHeart className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Support Cause</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{d.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{d.description || d.kind}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-accent mt-1" />
        </div>
      </div>
    </button>
  );
}