import { useEffect, useState } from "react";
import { ArrowLeft, Briefcase, Users, Check, X as XIcon, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Job = { id: string; title: string; company: string | null; applicants_count: number; created_at: string };
type App = {
  id: string; job_id: string; applicant_id: string; status: string; created_at: string;
  full_name: string | null; email: string | null; phone: string | null;
  country: string | null; city: string | null; education: string | null;
  experience: string | null; skills: string[] | null; resume_url: string | null;
  cover_letter: string | null; message: string | null;
};

const Employer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,company,applicants_count,created_at")
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false });
      setJobs((data as Job[]) || []);
      if (data && data.length && !activeJob) setActiveJob(data[0].id);
      setLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!activeJob) return;
    (async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", activeJob)
        .order("created_at", { ascending: false });
      setApps((data as App[]) || []);
    })();
  }, [activeJob]);

  const review = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("job_applications")
      .update({ status, reviewed_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast({ title: status === "approved" ? "Application approved" : "Application declined" });
  };

  const visible = apps.filter((a) => a.status === filter);

  return (
    <div className="min-h-screen pb-24">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Employer Dashboard</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No jobs posted yet</p>
          <button onClick={() => navigate("/create")} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Post a job
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {jobs.map((j) => (
              <button
                key={j.id}
                onClick={() => setActiveJob(j.id)}
                className={`flex shrink-0 flex-col items-start gap-0.5 rounded-2xl border px-3 py-2 text-left transition-all ${
                  activeJob === j.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
                }`}
              >
                <span className="max-w-[180px] truncate text-xs font-semibold text-foreground">{j.title}</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users className="h-3 w-3" /> {j.applicants_count} · {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 px-4 pb-2">
            {(["pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  filter === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                }`}
              >
                {s} ({apps.filter((a) => a.status === s).length})
              </button>
            ))}
          </div>

          <div className="space-y-2 px-3">
            {visible.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">No {filter} applications.</p>
            ) : visible.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{a.full_name || "Applicant"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[a.city, a.country].filter(Boolean).join(", ")} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {a.email} {a.phone ? `· ${a.phone}` : ""}
                    </p>
                    {a.education && <p className="mt-1 text-xs text-foreground/80"><span className="text-muted-foreground">Education:</span> {a.education}</p>}
                    {a.skills && a.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.skills.map((s) => (
                          <span key={s} className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}
                    {(a.cover_letter || a.message) && (
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs text-foreground/90">{a.cover_letter || a.message}</p>
                    )}
                    {a.resume_url && (
                      <a href={a.resume_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <FileText className="h-3.5 w-3.5" /> View resume
                      </a>
                    )}
                  </div>
                </div>
                {a.status === "pending" && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => review(a.id, "approved")} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => review(a.id, "rejected")} className="flex flex-1 items-center justify-center gap-1 rounded-full border border-destructive/40 py-2 text-xs font-semibold text-destructive">
                      <XIcon className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
                {a.status !== "pending" && (
                  <span className={`mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${a.status === "approved" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                    {a.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Employer;