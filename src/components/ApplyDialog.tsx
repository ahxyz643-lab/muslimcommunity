import { useState } from "react";
import { X, Loader2, Upload } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(4).max(30),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  education: z.string().trim().max(200).optional().or(z.literal("")),
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
  skills: z.string().trim().max(300).optional().or(z.literal("")),
  cover_letter: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ApplyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle?: string;
};

const ApplyDialog = ({ open, onOpenChange, jobId, jobTitle }: ApplyDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    country: "",
    city: "",
    education: "",
    experience: "",
    skills: "",
    cover_letter: "",
  });

  if (!open) return null;

  const onResume = (f: File | null) => {
    if (!f) return setResume(null);
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Resume must be under 5MB", variant: "destructive" });
      return;
    }
    setResume(f);
  };

  const submit = async () => {
    if (!user) {
      toast({ title: "Please sign in to apply", variant: "destructive" });
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast({ title: first || "Please fill required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let resume_url: string | null = null;
      if (resume) {
        const ext = resume.name.split(".").pop() || "pdf";
        const path = `resumes/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, resume, {
          contentType: resume.type || "application/pdf",
        });
        if (upErr) throw upErr;
        resume_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }

      const skillsArr = form.skills
        ? form.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)
        : [];

      const { error } = await supabase.from("job_applications").insert({
        job_id: jobId,
        applicant_id: user.id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        education: form.education.trim() || null,
        experience: form.experience.trim() || null,
        skills: skillsArr,
        resume_url,
        cover_letter: form.cover_letter.trim() || null,
        message: form.cover_letter.trim() || null,
      });
      if (error) throw error;

      await supabase.rpc; // no-op just for clarity
      // increment applicants_count best-effort
      const { data: job } = await supabase.from("jobs").select("applicants_count").eq("id", jobId).maybeSingle();
      if (job) {
        await supabase.from("jobs").update({ applicants_count: (job.applicants_count || 0) + 1 }).eq("id", jobId);
      }

      toast({ title: "Application submitted 🎉", description: jobTitle ? `Applied to ${jobTitle}` : undefined });
      onOpenChange(false);
    } catch (err: any) {
      console.error("[ApplyDialog]", err);
      toast({ title: "Could not apply", description: err.message || "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div
        className="glass-strong w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl border border-white/10 p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl leading-tight text-foreground">Apply</h2>
            {jobTitle && <p className="mt-0.5 text-xs text-muted-foreground">{jobTitle}</p>}
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          <input placeholder="Full name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Country *" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <input placeholder="City *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <input placeholder="Education (e.g. BSc Computer Science)" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <input placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <textarea placeholder="Experience summary" rows={3} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="w-full resize-none rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <textarea placeholder="Cover letter (why you're a fit)" rows={4} value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} className="w-full resize-none rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary" />

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground hover:border-primary/50">
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {resume ? resume.name : "Attach resume (PDF/DOC, ≤5MB)"}
            </span>
            {resume && (
              <button type="button" onClick={(e) => { e.preventDefault(); setResume(null); }} className="text-xs text-destructive">
                Remove
              </button>
            )}
            <input type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden" onChange={(e) => onResume(e.target.files?.[0] || null)} />
          </label>

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 w-full rounded-2xl py-3.5 font-body text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #c9a84c 0%, #e0c278 100%)", color: "#064e3b", boxShadow: "0 10px 24px -8px rgba(201,168,76,0.4)" }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</span>
            ) : (
              "Submit application"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyDialog;