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

    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHANNEL_ID");
    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ error: "Telegram bot not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const form = await req.formData();
    const file = form.get("file");
    const caption = (form.get("caption") as string) || "";
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Telegram getFile only supports downloads up to 20MB
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Video too large (max 20MB for Telegram storage)" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tgForm = new FormData();
    tgForm.append("chat_id", CHAT_ID);
    tgForm.append("caption", caption.slice(0, 1024));
    tgForm.append("supports_streaming", "true");
    tgForm.append("video", file, file.name || "video.mp4");

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, { method: "POST", body: tgForm });
    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      return new Response(JSON.stringify({ error: "Telegram upload failed", details: tgJson }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const msg = tgJson.result;
    const fileId: string | undefined = msg?.video?.file_id || msg?.document?.file_id || msg?.animation?.file_id;
    if (!fileId) {
      return new Response(JSON.stringify({ error: "No file_id returned", details: tgJson }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ file_id: fileId, message_id: msg.message_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});