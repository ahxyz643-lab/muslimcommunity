const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const raw = url.searchParams.get("file_id");
  if (!raw) return new Response("Missing file_id", { status: 400, headers: corsHeaders });

  // Parse optional bot prefix: "b1:<id>" or "b2:<id>"
  let botKey = "b1";
  let fileId = raw;
  const m = raw.match(/^(b[12]):(.+)$/);
  if (m) { botKey = m[1]; fileId = m[2]; }

  const tokens: Record<string, string | undefined> = {
    b1: Deno.env.get("TELEGRAM_BOT_TOKEN"),
    b2: Deno.env.get("TELEGRAM_BOT_TOKEN_2"),
  };
  const primary = tokens[botKey];
  const fallback = botKey === "b1" ? tokens.b2 : tokens.b1;
  const candidates = [primary, fallback].filter(Boolean) as string[];
  if (!candidates.length) return new Response("Bot not configured", { status: 500, headers: corsHeaders });

  try {
    let token: string | null = null;
    let filePath: string | null = null;
    let lastErr: any = null;
    for (const t of candidates) {
      const infoRes = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${encodeURIComponent(fileId)}`);
      const infoJson = await infoRes.json();
      if (infoJson.ok && infoJson.result?.file_path) {
        token = t;
        filePath = infoJson.result.file_path;
        break;
      }
      lastErr = infoJson;
    }
    if (!token || !filePath) {
      return new Response(JSON.stringify({ error: "File not found", details: lastErr }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward Range header for video seeking
    const forwardHeaders: HeadersInit = {};
    const range = req.headers.get("range");
    if (range) (forwardHeaders as any).Range = range;

    const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, { headers: forwardHeaders });
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", fileRes.headers.get("content-type") || "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=600");
    const cl = fileRes.headers.get("content-length"); if (cl) headers.set("Content-Length", cl);
    const cr = fileRes.headers.get("content-range"); if (cr) headers.set("Content-Range", cr);

    return new Response(fileRes.body, { status: fileRes.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});