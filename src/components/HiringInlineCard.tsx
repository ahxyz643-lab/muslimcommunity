import { useEffect, useState } from "react";
import { Briefcase, MapPin, Users, Wallet, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ApplyDialog from "@/components/ApplyDialog";
import LoginPromptDialog from "@/components/LoginPromptDialog";
import { useNavigate } from "react-router-dom";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  description: string | null;
  applicants_count: number;
  remote: boolean | null;
  country: string | null;
  city: string | null;
  poster_id: string;
};

const HiringInlineCard = ({ jobId }: { jobId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);
  const [askLogin, setAskLogin] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("jobs")
      .select("id, title, company, location, job_type, salary_range, description, applicants_count, remote, country, city, poster_id")
      .eq("id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setJob(data as Job);
      });
    return () => { alive = false; };
  }, [jobId]);

  // Live-update applicants_count when new applications come in
  useEffect(() => {
    const ch = supabase
      .channel(`job-apps-${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_applications", filter: `job_id=eq.${jobId}` },
        () => setJob((prev) => (prev ? { ...prev, applicants_count: (prev.applicants_count || 0) + 1 } : prev)),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  if (!job) {
    return <div className="mx-4 mb-3 h-24 animate-pulse rounded-2xl border border-border bg-secondary/40" />;
  }

  const isOwner = user?.id === job.poster_id;

  return (
    <>
      <div className="mx-4 mb-3 overflow-hidden rounded-2xl border border-[#c9a84c]/25 bg-gradient-to-br from-emerald-brand/10 via-transparent to-[#c9a84c]/10">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c9a84c]/15 text-[#c9a84c]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9a84c]">Hiring</p>
              <p className="truncate text-sm font-bold text-foreground">{job.title}</p>
              {job.company && <p className="truncate text-xs text-muted-foreground">{job.company}</p>}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            {(job.city || job.location) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-muted-foreground">
                <MapPin className="h-3 w-3" /> {[job.city, job.country].filter(Boolean).join(", ") || job.location}
              </span>
            )}
            {job.job_type && (
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 capitalize text-muted-foreground">
                {job.job_type.replace("_", " ")}
              </span>
            )}
            {job.remote && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                <Globe2 className="h-3 w-3" /> Remote
              </span>
            )}
            {job.salary_range && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a84c]/15 px-2 py-0.5 font-medium text-[#c9a84c]">
                <Wallet className="h-3 w-3" /> {job.salary_range}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> {job.applicants_count} applied
            </span>
            {isOwner ? (
              <button
                onClick={() => navigate("/employer")}
                className="rounded-full border border-primary/40 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Manage applicants
              </button>
            ) : (
              <button
                onClick={() => (user ? setOpen(true) : setAskLogin(true))}
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-[#064e3b]"
                style={{ background: "linear-gradient(135deg, #c9a84c 0%, #e0c278 100%)" }}
              >
                Apply Now
              </button>
            )}
          </div>
        </div>
      </div>

      <ApplyDialog open={open} onOpenChange={setOpen} jobId={job.id} jobTitle={job.title} />
      <LoginPromptDialog open={askLogin} onOpenChange={setAskLogin} action="apply for jobs" />
    </>
  );
};

export default HiringInlineCard;