import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const BOTS = [
      { id: "b1", token: Deno.env.get("TELEGRAM_BOT_TOKEN"), chat: Deno.env.get("TELEGRAM_CHANNEL_ID") },
      { id: "b2", token: Deno.env.get("TELEGRAM_BOT_TOKEN_2"), chat: Deno.env.get("TELEGRAM_CHANNEL_ID_2") },
    ].filter(b => b.token && b.chat);
    if (!BOTS.length) {
      return new Response(JSON.stringify({ error: "Telegram bot not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const form = await req.formData();
    const file = form.get("file");
    const caption = (form.get("caption") as string) || "";
    const preferredBot = ((form.get("bot") as string) || "").trim(); // "b1" | "b2" | ""
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Telegram getFile only supports downloads up to 20MB
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Video too large (max 20MB for Telegram storage)" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Choose Telegram endpoint based on mime.
    const mime = (file.type || "").toLowerCase();
    const isImage = mime.startsWith("image/");
    const useSendVideo = !isImage && (mime === "video/mp4" || (!mime && (file.name || "").toLowerCase().endsWith(".mp4")));
    const endpoint = isImage ? "sendPhoto" : useSendVideo ? "sendVideo" : "sendDocument";
    const fileBuf = await file.arrayBuffer();
    let msg: any = null;
    let usedBot: string | null = null;
    let lastErr: any = null;
    // If caller asked for a specific bot, try it first
    const orderedBots = preferredBot
      ? [...BOTS].sort((a, b) => (a.id === preferredBot ? -1 : b.id === preferredBot ? 1 : 0))
      : BOTS;
    for (const bot of orderedBots) {
      const tgForm = new FormData();
      tgForm.append("chat_id", bot.chat!);
      tgForm.append("caption", caption.slice(0, 1024));
      const blob = new Blob([fileBuf], { type: file.type || "application/octet-stream" });
      if (isImage) {
        tgForm.append("photo", blob, file.name || "photo.jpg");
      } else if (useSendVideo) {
        tgForm.append("supports_streaming", "true");
        tgForm.append("video", blob, file.name || "video.mp4");
      } else {
        tgForm.append("document", blob, file.name || "video");
      }
      const tgRes = await fetch(`https://api.telegram.org/bot${bot.token}/${endpoint}`, { method: "POST", body: tgForm });
      const tgJson = await tgRes.json();
      if (tgJson.ok) {
        msg = tgJson.result;
        usedBot = bot.id;
        break;
      }
      lastErr = tgJson;
    }
    if (!msg || !usedBot) {
      return new Response(JSON.stringify({ error: "All Telegram bots failed", details: lastErr }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Photos are returned as an array of sizes; take the largest.
    const photoArr: any[] = Array.isArray(msg?.photo) ? msg.photo : [];
    const largestPhoto = photoArr.length ? photoArr[photoArr.length - 1] : null;
    const fileId: string | undefined = msg?.video?.file_id || msg?.document?.file_id || msg?.animation?.file_id || largestPhoto?.file_id;
    const mimeOut: string | undefined = msg?.video?.mime_type || msg?.document?.mime_type || msg?.animation?.mime_type || (largestPhoto ? "image/jpeg" : undefined);
    if (!fileId) {
      return new Response(JSON.stringify({ error: "No file_id returned", details: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prefix file_id with bot id so we know which token to use on retrieval
    return new Response(JSON.stringify({ file_id: `${usedBot}:${fileId}`, message_id: msg.message_id, mime_type: mimeOut, bot: usedBot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});