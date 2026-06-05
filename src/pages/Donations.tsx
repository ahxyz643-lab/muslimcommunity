import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HandHeart, Plus, X, Loader2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Donations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "charity", title: "", description: "", amount: "", currency: "USD", contact: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["donations-feed"],
    queryFn: async () => {
      const { data } = await supabase.from("donations").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const submit = async () => {
    if (!user || !form.title) return;
    setSubmitting(true);
    const { error } = await supabase.from("donations").insert({
      user_id: user.id, kind: form.kind, title: form.title, description: form.description,
      amount: form.amount ? Number(form.amount) : null, currency: form.currency, contact: form.contact, status: "pending",
    });
    setSubmitting(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else {
      toast({ title: "Submitted! Awaiting admin review." });
      setOpen(false);
      setForm({ kind: "charity", title: "", description: "", amount: "", currency: "USD", contact: "" });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <HandHeart className="h-5 w-5 text-accent" />
          <h1 className="text-base font-bold">Donations</h1>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
          <Plus className="h-4 w-4" /> Request
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <HandHeart className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No causes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Be the first to request support.</p>
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {items.map((d: any) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent"><HandHeart className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground">{d.title}</p>
                    {d.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{d.kind}</p>
                </div>
                {d.amount != null && <span className="text-sm font-bold text-accent">{d.currency} {Number(d.amount).toLocaleString()}</span>}
              </div>
              <p className="mt-2 text-xs text-foreground whitespace-pre-wrap line-clamp-4">{d.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                {d.contact && (
                  <a href={d.contact.startsWith("http") ? d.contact : `mailto:${d.contact}`} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">
                    Donate
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-t-3xl bg-card p-5 max-h-[90vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Request Donation</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none">
                <option value="charity">Charity</option>
                <option value="zakat">Zakat</option>
                <option value="sadaqah">Sadaqah</option>
                <option value="medical">Medical</option>
                <option value="education">Education</option>
                <option value="mosque">Mosque</option>
              </select>
              <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <textarea placeholder="Describe the cause" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="col-span-2 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none">
                  <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>PKR</option><option>SAR</option><option>AED</option>
                </select>
              </div>
              <input placeholder="Contact (email or link) *" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <button onClick={submit} disabled={submitting || !form.title} className="w-full rounded-full bg-accent py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}