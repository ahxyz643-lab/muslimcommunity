import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, MapPin, X, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Jobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", location: "", description: "", job_type: "full_time", salary_range: "", contact_link: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs-feed"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const apply = async (job_id: string) => {
    if (!user) return;
    const { error } = await supabase.from("job_applications").insert({ job_id, applicant_id: user.id, message: "I'm interested" });
    if (error) toast({ title: error.message, variant: "destructive" });
    else {
      await supabase.from("jobs").update({ applicants_count: (jobs.find((j: any) => j.id === job_id)?.applicants_count || 0) + 1 }).eq("id", job_id);
      toast({ title: "Applied! 🎉" });
      qc.invalidateQueries({ queryKey: ["jobs-feed"] });
    }
  };

  const submit = async () => {
    if (!user || !form.title || !form.description) return;
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert({ ...form, poster_id: user.id, status: "pending" });
    setSubmitting(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else {
      toast({ title: "Submitted! Awaiting admin approval." });
      setOpen(false);
      setForm({ title: "", company: "", location: "", description: "", job_type: "full_time", salary_range: "", contact_link: "" });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold">Jobs</h1>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Post
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No jobs yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Be the first to post an opportunity.</p>
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {jobs.map((j: any) => (
            <div key={j.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Briefcase className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{j.title}</p>
                  <p className="text-xs text-muted-foreground">{j.company || "—"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {j.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                    <span className="rounded-full bg-secondary px-2 py-0.5 capitalize">{j.job_type?.replace("_", " ")}</span>
                    {j.salary_range && <span className="font-medium text-primary">{j.salary_range}</span>}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-foreground line-clamp-3 whitespace-pre-wrap">{j.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" />{j.applicants_count} applied · {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}</span>
                <button onClick={() => apply(j.id)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Apply</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-t-3xl bg-card p-5 max-h-[90vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Post a Job</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2">
              <input placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
                <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none">
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              <input placeholder="Salary range (optional)" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <input placeholder="Contact link / email" value={form.contact_link} onChange={(e) => setForm({ ...form, contact_link: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <textarea placeholder="Description *" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              <button onClick={submit} disabled={submitting || !form.title || !form.description} className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}