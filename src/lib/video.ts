import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/telegram-video`;

/** Returns playable URL for a row that may have telegram_file_id or fallback video_url. */
export function getVideoSrc(row: { telegram_file_id?: string | null; video_url?: string | null } | null | undefined): string {
  if (!row) return "";
  if (row.telegram_file_id) return `${FN_BASE}?file_id=${encodeURIComponent(row.telegram_file_id)}`;
  return row.video_url || "";
}

/** Configurable media limit — Telegram bot download API caps at 20MB. */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

export function validateVideo(file: File): string | null {
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|mkv|avi)$/i.test(file.name)) {
    return "That file isn't a supported video format.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `This video is too large. Please choose a smaller video (under ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB).`;
  }
  return null;
}

type UploadOpts = {
  caption?: string;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
};

/** Uploads a video file to Telegram via edge function. Returns the Telegram file_id. */
export async function uploadVideoToTelegram(file: File, captionOrOpts?: string | UploadOpts): Promise<string> {
  const opts: UploadOpts = typeof captionOrOpts === "string" ? { caption: captionOrOpts } : captionOrOpts || {};
  const invalid = validateVideo(file);
  if (invalid) throw new Error(invalid);

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Your session expired. Please sign in again.");

  const fd = new FormData();
  fd.append("file", file);
  if (opts.caption) fd.append("caption", opts.caption);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://${PROJECT_ID}.supabase.co/functions/v1/telegram-upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Network error. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.onload = () => {
      let json: any = {};
      try { json = JSON.parse(xhr.responseText || "{}"); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && json.file_id) {
        opts.onProgress?.(100);
        resolve(json.file_id as string);
      } else {
        console.error("[telegram-upload]", xhr.status, xhr.responseText);
        reject(new Error(xhr.status === 413 ? "This video is too large. Please choose a smaller video." : "We couldn't upload your video. Please try again."));
      }
    };
    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(fd);
  });
}