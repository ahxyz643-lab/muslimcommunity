import { X, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadManager, CONTENT_LABELS, type UploadJob } from "@/lib/upload/UploadManager";

const speedTxt = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB/s` : `${Math.round(b / 1e3)} KB/s`);
const etaTxt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s left` : `${Math.round(s)}s left`);

/** One upload row: bar, %, stage, speed, ETA, cancel / retry. */
const UploadProgress = ({ job }: { job: UploadJob }) => {
  const active = job.status === "queued" || job.status === "uploading" || job.status === "processing";
  const label = CONTENT_LABELS[job.contentType];
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm">
        {job.status === "complete" ? <CheckCircle2 className="h-4 w-4 text-primary" />
          : job.status === "failed" ? <AlertCircle className="h-4 w-4 text-destructive" />
          : <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
          {job.status === "complete" ? "Upload complete ✓" : job.status === "failed" ? "Upload failed" : job.status === "cancelled" ? "Upload cancelled" : `Uploading ${label}`}
        </span>
        {active && <span className="tabular-nums text-xs font-semibold text-foreground">{job.progress}%</span>}
        {active && <button aria-label="Cancel upload" onClick={() => uploadManager.cancel(job.uploadId)} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        {job.status === "failed" && uploadManager.canRetry(job.uploadId) && (
          <button onClick={() => uploadManager.retry(job.uploadId)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"><RotateCcw className="h-3 w-3" /> Retry</button>
        )}
        {!active && <button aria-label="Dismiss" onClick={() => uploadManager.dismiss(job.uploadId)} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
      </div>
      {(active || job.status === "complete") && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full gradient-primary transition-all duration-300" style={{ width: `${job.progress}%` }} />
        </div>
      )}
      <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
        {job.status === "failed" ? job.error : [job.title, active && job.stage, job.speed && speedTxt(job.speed), job.eta != null && etaTxt(job.eta)].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
};

export default UploadProgress;
