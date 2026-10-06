import { supabase } from "@/integrations/supabase/client";
import { queueAll } from "@/lib/offline/db";

export type PostState = { liked: boolean; saved: boolean; reposted: boolean };

/**
 * Batches "did I like/save/repost this?" lookups: every PostCard that mounts in the
 * same tick is resolved with 3 queries total (instead of 3 per post), results are
 * memoised per session, and locally-queued toggles override server values.
 */
const memo = new Map<string, Promise<PostState>>();
let pending: { userId: string; ids: Set<string>; resolvers: Map<string, (s: PostState) => void> } | null = null;

async function flush(batch: NonNullable<typeof pending>) {
  const ids = [...batch.ids];
  const { userId } = batch;
  const [l, s, r, queue] = await Promise.all([
    supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("saves").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("reposts").select("post_id").eq("user_id", userId).in("post_id", ids),
    queueAll(),
  ]);
  const liked = new Set((l.data || []).map((x) => x.post_id));
  const saved = new Set((s.data || []).map((x) => x.post_id));
  const reposted = new Set((r.data || []).map((x) => x.post_id));
  for (const a of queue) {
    const pid = a.payload?.post_id;
    if (!pid || a.payload?.user_id !== userId) continue;
    const apply = (set: Set<string>, on: boolean) => (on ? set.add(pid) : set.delete(pid));
    if (a.type === "like" || a.type === "unlike") apply(liked, a.type === "like");
    if (a.type === "save" || a.type === "unsave") apply(saved, a.type === "save");
    if (a.type === "repost" || a.type === "unrepost") apply(reposted, a.type === "repost");
  }
  batch.resolvers.forEach((res, id) => res({ liked: liked.has(id), saved: saved.has(id), reposted: reposted.has(id) }));
}

export function getPostState(userId: string, postId: string): Promise<PostState> {
  const k = `${userId}:${postId}`;
  const hit = memo.get(k);
  if (hit) return hit;
  if (!pending || pending.userId !== userId) {
    const batch = { userId, ids: new Set<string>(), resolvers: new Map() };
    pending = batch;
    setTimeout(() => { if (pending === batch) pending = null; void flush(batch); }, 30);
  }
  const p = new Promise<PostState>((res) => { pending!.ids.add(postId); pending!.resolvers.set(postId, res); });
  memo.set(k, p);
  return p;
}

/** Keep the memo in sync after a local toggle so remounts show the right state. */
export function patchPostState(userId: string, postId: string, patch: Partial<PostState>) {
  const k = `${userId}:${postId}`;
  const prev = memo.get(k) || Promise.resolve({ liked: false, saved: false, reposted: false });
  memo.set(k, prev.then((s) => ({ ...s, ...patch })));
}
