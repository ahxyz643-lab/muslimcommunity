import { supabase } from "@/integrations/supabase/client";
import type { PostWithProfile } from "@/components/PostCard";

type MiniProfile = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null; verified: boolean | null };

/** Session-wide profile cache (10 min) so feeds never re-fetch the same authors. */
const PROFILE_TTL = 10 * 60 * 1000;
const profileCache = new Map<string, { at: number; p: MiniProfile | null }>();
const inflight = new Map<string, Promise<void>>();

export async function getProfiles(userIds: string[]): Promise<Map<string, MiniProfile>> {
  const now = Date.now();
  const missing = userIds.filter((id) => {
    const c = profileCache.get(id);
    return (!c || now - c.at > PROFILE_TTL) && !inflight.has(id);
  });
  if (missing.length) {
    const req = (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, verified")
        .in("user_id", missing);
      const found = new Map((data || []).map((p) => [p.user_id, p as MiniProfile]));
      missing.forEach((id) => profileCache.set(id, { at: Date.now(), p: found.get(id) || null }));
    })();
    missing.forEach((id) => inflight.set(id, req));
    try { await req; } finally { missing.forEach((id) => inflight.delete(id)); }
  }
  await Promise.all(userIds.map((id) => inflight.get(id)).filter(Boolean));
  const out = new Map<string, MiniProfile>();
  userIds.forEach((id) => { const p = profileCache.get(id)?.p; if (p) out.set(id, p); });
  return out;
}

export async function fetchPostsWithProfiles(queryBuilder: any): Promise<PostWithProfile[]> {
  const { data } = await queryBuilder;
  if (!data || data.length === 0) return [];
  const userIds = [...new Set(data.map((p: any) => p.user_id))] as string[];
  const profileMap = await getProfiles(userIds);
  return data.map((post: any) => ({ ...post, profiles: profileMap.get(post.user_id) || null }));
}
