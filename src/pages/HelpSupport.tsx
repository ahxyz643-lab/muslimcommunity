import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Send, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    if (!subject.trim() || !message.trim()) { toast({ title: "Please fill subject and message", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject: subject.trim(), message: message.trim(), category, status: "open",
    } as any);
    setSubmitting(false);
    if (error) { toast({ title: "Failed to send", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ticket sent — we'll get back to you soon." });
    setSubject(""); setMessage(""); refresh();
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-base font-semibold text-foreground">Help & Support</h1>
      </div>
      <div className="space-y-6 px-4 py-4">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2"><HelpCircle className="h-4 w-4 text-muted-foreground"/><h2 className="text-sm font-semibold">Contact us</h2></div>
          <div className="space-y-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none">
              <option value="general">General question</option>
              <option value="bug">Bug report</option>
              <option value="account">Account issue</option>
              <option value="content">Content / abuse</option>
              <option value="feedback">Feedback</option>
            </select>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="bg-secondary border-border"/>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="How can we help?" className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm focus:outline-none"/>
            <Button onClick={submit} disabled={submitting} className="w-full gradient-primary text-primary-foreground">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Send className="h-4 w-4 mr-2"/>Send ticket</>}
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your tickets</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
          ) : tickets.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {tickets.map((t) => (
                <div key={t.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{t.subject}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${t.status === "resolved" ? "bg-primary/20 text-primary" : t.status === "in_progress" ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"}`}>{t.status?.replace("_"," ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HelpSupport;