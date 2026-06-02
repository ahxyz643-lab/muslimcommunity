import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/telegram-video`;

/** Returns playable URL for a row that may have telegram_file_id or fallback video_url. */
export function getVideoSrc(row: { telegram_file_id?: string | null; video_url?: string | null } | null | undefined): string {
  if (!row) return "";
  if (row.telegram_file_id) return `${FN_BASE}?file_id=${encodeURIComponent(row.telegram_file_id)}`;
  return row.video_url || "";
}

/** Uploads a video file to Telegram via edge function. Returns the Telegram file_id. */
export async function uploadVideoToTelegram(file: File, caption?: string): Promise<string> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Video must be under 20MB (Telegram storage limit)");
  }
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const fd = new FormData();
  fd.append("file", file);
  if (caption) fd.append("caption", caption);

  const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/telegram-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json.file_id as string;
}