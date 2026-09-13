const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/tiktok";

const VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "cover_image_url",
  "share_url",
  "embed_link",
  "duration",
  "create_time",
  "like_count",
  "comment_count",
  "view_count",
  "share_count",
].join(",");

const USER_FIELDS = [
  "open_id",
  "display_name",
  "avatar_url",
  "bio_description",
  "profile_deep_link",
  "is_verified",
  "follower_count",
  "video_count",
].join(",");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TIKTOK_API_KEY = Deno.env.get("TIKTOK_API_KEY");
  if (!LOVABLE_API_KEY || !TIKTOK_API_KEY) {
    return json({ error: "TikTok is not connected yet." }, 503);
  }

  const headers = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": TIKTOK_API_KEY,
    "Content-Type": "application/json",
  };

  try {
    const url = new URL(req.url);
    let cursor: number | undefined;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.cursor === "number") cursor = body.cursor;
    } else {
      const c = url.searchParams.get("cursor");
      if (c && !Number.isNaN(Number(c))) cursor = Number(c);
    }

    const [userRes, videoRes] = await Promise.all([
      fetch(`${GATEWAY_URL}/user/info/?fields=${USER_FIELDS}`, { method: "GET", headers }),
      fetch(`${GATEWAY_URL}/video/list/?fields=${VIDEO_FIELDS}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
      }),
    ]);

    if (!videoRes.ok) {
      const details = await videoRes.text();
      console.error(`TikTok video list failed [${videoRes.status}]: ${details}`);
      return json({ error: "TikTok request failed", status: videoRes.status, details }, videoRes.status);
    }

    const videoJson = await videoRes.json();
    if (videoJson?.error && videoJson.error.code !== "ok") {
      console.error("TikTok video list error:", JSON.stringify(videoJson.error));
      return json({ error: videoJson.error.message || "TikTok request failed", code: videoJson.error.code }, 400);
    }

    let profile: unknown = null;
    if (userRes.ok) {
      const userJson = await userRes.json();
      if (!userJson?.error || userJson.error.code === "ok") profile = userJson?.data?.user ?? null;
      else console.error("TikTok user info error:", JSON.stringify(userJson.error));
    } else {
      console.error(`TikTok user info failed [${userRes.status}]: ${await userRes.text()}`);
    }

    return json({
      profile,
      videos: videoJson?.data?.videos ?? [],
      cursor: videoJson?.data?.cursor ?? null,
      has_more: Boolean(videoJson?.data?.has_more),
    });
  } catch (err) {
    console.error("tiktok-videos crashed:", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
