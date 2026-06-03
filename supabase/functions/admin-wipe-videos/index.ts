import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv|3gp|ogv)$/i;

async function listAll(admin: any, bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error || !data) break;
    for (const item of data) {
      // If it's a folder (no id), recurse
      if (!item.id && item.name) {
        const nested = await listAll(admin, bucket, prefix ? `${prefix}/${item.name}` : item.name);
        out.push(...nested);
      } else if (item.name) {
        out.push(prefix ? `${prefix}/${item.name}` : item.name);
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const uid = claims?.claims?.sub;
    if (!uid) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Must be admin
    const { data: role } = await userClient.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const summary: Record<string, { listed: number; deleted: number; errors: number }> = {};

    for (const bucket of ["media", "reels"]) {
      const all = await listAll(admin, bucket);
      // For 'media' bucket only target video files (preserve images); 'reels' is all videos
      const targets = bucket === "media" ? all.filter(n => VIDEO_EXT.test(n)) : all;
      let deleted = 0, errors = 0;
      // Delete in chunks of 100
      for (let i = 0; i < targets.length; i += 100) {
        const chunk = targets.slice(i, i + 100);
        const { error } = await admin.storage.from(bucket).remove(chunk);
        if (error) errors += chunk.length; else deleted += chunk.length;
      }
      summary[bucket] = { listed: targets.length, deleted, errors };
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});