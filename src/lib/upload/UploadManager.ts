import { supabase } from "@/integrations/supabase/client";
import { uploadVideoToTelegram } from "@/lib/video";
import { uploadUserFile } from "@/lib/storage";

export type ContentType = "reel" | "video_post" | "sports" | "job" | "announcement" | "support";
export type UploadStatus = "queued" | "uploading" | "processing" | "complete" | "failed" | "cancelled";

export const CONTENT_LABELS: Record<ContentType, string> = {
  reel: "Reel", video_post: "Video Post", sports: "Sports", job: "Job", announcement: "Announcement", support: "Support",
};

export type Draft = {
  contentType: ContentType;
  title: string;
  caption: string;
  hashtags: string;
  mentions: string;
  audience: "public" | "followers" | "private";
  commentsEnabled: boolean;
  sport?: string; event?: string; teams?: string; datetime?: string; venue?: string; result?: string;
  company?: string; location?: string; workMode?: "on_site" | "remote" | "hybrid"; jobType?: string;
  salary?: string; skills?: string; applyMethod?: string; deadline?: string;
  category?: string; amount?: string; currency?: string; contact?: string;
};

export type UploadJob = {
  uploadId: string;
  userId: string;
  contentType: ContentType;
  title: string;
  fileName: string | null;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  stage: string;
  retryCount: number;
  error: string | null;
  telegramFileId: string | null;
  telegramMessageId: string | null;
  recordId: string | null;
  speed: number | null; // bytes/sec
  eta: number | null; // seconds
  createdAt: number;
};

type Payload = { media: File | null; cover: File | null; draft: Draft; abort?: AbortController; imageUrl?: string | null; coverUrl?: string | null };

const KEY = "mc:uploads";
const payloads = new Map<string, Payload>();
const listeners = new Set<() => void>();
let jobs: UploadJob[] = load();

function load(): UploadJob[] {
  try {
    const raw: UploadJob[] = JSON.parse(sessionStorage.getItem(KEY) || "[]");
    // After a page reload the file itself is gone — mark unfinished jobs as interrupted.
    return raw.map((j) =>
      ["queued", "uploading", "processing"].includes(j.status)
        ? { ...j, status: "failed", error: "Upload interrupted when the app was reloaded. Please upload again.", stage: "Interrupted" }
        : j,
    );
  } catch { return []; }
}

function emit() {
  try { sessionStorage.setItem(KEY, JSON.stringify(jobs.slice(0, 10))); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function patch(id: string, p: Partial<UploadJob>) {
  jobs = jobs.map((j) => (j.uploadId === id ? { ...j, ...p } : j));
  emit();
}

export const uploadManager = {
  subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; },
  getJobs: () => jobs,

  start(userId: string, draft: Draft, media: File | null, cover: File | null): string {
    const uploadId = crypto.randomUUID();
    const job: UploadJob = {
      uploadId, userId, contentType: draft.contentType,
      title: draft.title || draft.caption.slice(0, 60) || CONTENT_LABELS[draft.contentType],
      fileName: media?.name ?? null, fileSize: media?.size ?? 0,
      progress: 0, status: "queued", stage: "Queued", retryCount: 0, error: null,
      telegramFileId: null, telegramMessageId: null, recordId: null, speed: null, eta: null, createdAt: Date.now(),
    };
    jobs = [job, ...jobs];
    payloads.set(uploadId, { media, cover, draft });
    emit();
    void run(uploadId);
    return uploadId;
  },

  cancel(id: string) {
    payloads.get(id)?.abort?.abort();
    patch(id, { status: "cancelled", stage: "Cancelled", speed: null, eta: null });
  },

  retry(id: string) {
    const job = jobs.find((j) => j.uploadId === id);
    if (!job || !payloads.has(id)) return false;
    patch(id, { status: "queued", stage: "Retrying", error: null, retryCount: job.retryCount + 1 });
    void run(id);
    return true;
  },

  canRetry: (id: string) => payloads.has(id),

  dismiss(id: string) {
    jobs = jobs.filter((j) => j.uploadId !== id);
    payloads.delete(id);
    emit();
  },
};

const isVideo = (f: File | null) => !!f && (f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name));

async function run(id: string) {
  const p = payloads.get(id);
  const job = jobs.find((j) => j.uploadId === id);
  if (!p || !job) return;
  const ctrl = new AbortController();
  p.abort = ctrl;
  try {
    patch(id, { status: "uploading", stage: "Uploading media", progress: 0 });
    const started = Date.now();

    if (p.media && isVideo(p.media) && !job.telegramFileId) {
      const fileId = await uploadVideoToTelegram(p.media, {
        caption: p.draft.caption || p.draft.title || undefined,
        signal: ctrl.signal,
        onProgress: (pct) => {
          const secs = (Date.now() - started) / 1000;
          const sent = (pct / 100) * job.fileSize;
          const speed = secs > 0.5 ? sent / secs : null;
          const eta = speed ? Math.max(0, (job.fileSize - sent) / speed) : null;
          patch(id, { progress: Math.min(95, Math.round(pct * 0.95)), speed, eta, stage: pct >= 100 ? "Saving to secure storage" : "Uploading media" });
        },
      });
      patch(id, { telegramFileId: fileId });
    } else if (p.media && !isVideo(p.media) && !p.imageUrl) {
      patch(id, { progress: 30 });
      p.imageUrl = await uploadUserFile("media", job.userId, "photos", p.media);
      patch(id, { progress: 90 });
    }
    if (ctrl.signal.aborted) return;

    if (p.cover && !p.coverUrl) {
      patch(id, { stage: "Uploading cover" });
      p.coverUrl = await uploadUserFile("media", job.userId, "covers", p.cover);
    }

    patch(id, { status: "processing", stage: "Publishing", progress: 97, speed: null, eta: null });
    const fresh = jobs.find((j) => j.uploadId === id)!;
    const recordId = await publish(job.userId, p.draft, fresh.telegramFileId, p.imageUrl ?? null, p.coverUrl ?? null);
    patch(id, { status: "complete", stage: "Upload complete", progress: 100, recordId });
    setTimeout(() => {
      const j = jobs.find((x) => x.uploadId === id);
      if (j?.status === "complete") uploadManager.dismiss(id);
    }, 6000);
  } catch (e: any) {
    if (ctrl.signal.aborted || /cancelled/i.test(e?.message || "")) return;
    console.error("[UploadManager]", e);
    patch(id, { status: "failed", stage: "Upload failed", error: e?.message || "Something went wrong", speed: null, eta: null });
  }
}

const tags = (d: Draft) =>
  Array.from(new Set(`${d.hashtags} ${d.caption}`.match(/#?[\p{L}\p{N}_]+/gu)?.filter((t, _i, _a) => true) || []))
    .filter((t) => d.hashtags.includes(t) || t.startsWith("#"))
    .map((t) => t.replace(/^#/, "").toLowerCase())
    .slice(0, 15);

function body(d: Draft) {
  const parts = [d.caption.trim()];
  if (d.mentions.trim()) parts.push(d.mentions.trim().split(/[\s,]+/).map((m) => (m.startsWith("@") ? m : `@${m}`)).join(" "));
  return parts.filter(Boolean).join("\n\n");
}

async function publish(userId: string, d: Draft, telegramFileId: string | null, imageUrl: string | null, coverUrl: string | null): Promise<string | null> {
  const hashtags = tags(d);

  if (d.contentType === "reel" && telegramFileId) {
    const { data, error } = await supabase.from("reels").insert({
      user_id: userId, video_url: "", telegram_file_id: telegramFileId,
      caption: body(d) || null, thumbnail_url: coverUrl,
    } as any).select("id").single();
    if (error) throw error;
    return data.id;
  }

  let purpose = "post";
  let title: string | null = d.title.trim() || null;
  let content = body(d);
  let jobId: string | null = null;
  let donationId: string | null = null;

  if (d.contentType === "sports") {
    purpose = "announcement";
    hashtags.unshift("sports");
    const lines = [
      d.sport && `🏅 ${d.sport}`, d.event && `Event: ${d.event}`, d.teams && `Teams: ${d.teams}`,
      d.datetime && `When: ${new Date(d.datetime).toLocaleString()}`, d.venue && `Venue: ${d.venue}`, d.result && `Result: ${d.result}`,
    ].filter(Boolean);
    content = [lines.join("\n"), content].filter(Boolean).join("\n\n");
    title = title || d.event || d.sport || "Sports update";
  }
  if (d.contentType === "announcement") purpose = "announcement";
  if (d.contentType === "job") {
    purpose = "hiring";
    const { data, error } = await supabase.from("jobs").insert({
      poster_id: userId, title: d.title.trim(), company: d.company?.trim() || null,
      location: d.location?.trim() || null, city: d.location?.trim() || null,
      description: content || d.title.trim(), job_type: d.jobType || "full_time",
      salary_range: d.salary?.trim() || null, contact_link: d.applyMethod?.trim() || null,
      skills: (d.skills || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
      apply_deadline: d.deadline ? new Date(d.deadline).toISOString() : null,
      remote: d.workMode === "remote" || d.workMode === "hybrid", status: "approved",
    } as any).select("id").single();
    if (error) throw error;
    jobId = data.id;
  }
  if (d.contentType === "support") {
    purpose = "support_request";
    const { data, error } = await supabase.from("donations").insert({
      user_id: userId, kind: d.category || "medical", title: d.title.trim(), description: content || null,
      amount: d.amount ? Number(d.amount) : null, currency: d.currency || "USD",
      contact: d.contact?.trim() || null, status: "pending",
    } as any).select("id").single();
    if (error) throw error;
    donationId = data.id;
  }

  const { data, error } = await supabase.from("posts").insert({
    user_id: userId, content: content || title || "", image_url: imageUrl, video_url: null,
    telegram_file_id: telegramFileId, purpose, title: purpose === "post" ? title : title,
    hashtags, job_id: jobId, donation_id: donationId,
  } as any).select("id").single();
  if (error) throw error;
  return data.id;
}
