import { supabase } from "@/integrations/supabase/client";
import { queueAll, queueDelete, queueFindByKey, queuePut, type QueuedAction } from "./db";

export type ActionType =
  | "like"
  | "unlike"
  | "save"
  | "unsave"
  | "repost"
  | "unrepost"
  | "follow"
  | "unfollow"
  | "comment"
  | "reel_comment"
  | "profile_update";

type Listener = () => void;

type State = {
  online: boolean;
  pending: number;
  syncing: boolean;
  failed: number;
};

let state: State = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  pending: 0,
  syncing: false,
  failed: 0,
};

const listeners = new Set<Listener>();

export function subscribeOffline(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getOfflineState() {
  return state;
}

function setState(patch: Partial<State>) {
  const next = { ...state, ...patch };
  if (
    next.online === state.online &&
    next.pending === state.pending &&
    next.syncing === state.syncing &&
    next.failed === state.failed
  )
    return;
  state = next;
  listeners.forEach((l) => l());
}

async function refreshCounts() {
  const all = await queueAll();
  setState({ pending: all.length, failed: all.filter((a) => a.attempts >= 3).length });
}

const MAX_ATTEMPTS = 8;
const BASE_DELAY = 2000;

/**
 * Enqueue an action for later delivery. If an action with the same dedupe key is
 * already queued (e.g. like then unlike) the newer one replaces it, so the server
 * never receives duplicate/conflicting writes.
 */
// Toggle-style actions are batched: they wait locally and flush every 5 minutes,
// when the app is hidden/closed, or when the queue gets large.
const BATCHED: Partial<Record<ActionType, ActionType>> = {
  like: "unlike", unlike: "like", save: "unsave", unsave: "save",
  repost: "unrepost", unrepost: "repost", follow: "unfollow", unfollow: "follow",
};
// Comments use a short window so others see them quickly, while still batching bursts.
const COMMENT_DELAY = 10_000;
const BATCH_INTERVAL = 5 * 60_000;
const MAX_QUEUE_BEFORE_FLUSH = 25;
let commentTimer: number | undefined;

export async function enqueue(type: ActionType, key: string, payload: any) {
  const existing = await queueFindByKey(key);
  // Like -> Unlike (or vice-versa) before sync: the two cancel out, nothing hits the server.
  if (existing && BATCHED[type] && BATCHED[type] === existing.type) {
    await queueDelete(existing.id);
    await refreshCounts();
    return;
  }
  const action: QueuedAction = {
    id: existing?.id || crypto.randomUUID(),
    key,
    type,
    payload,
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: existing?.createdAt || Date.now(),
  };
  await queuePut(action);
  await refreshCounts();
  if (!state.online) return;
  if (BATCHED[type]) {
    if (state.pending >= MAX_QUEUE_BEFORE_FLUSH) void syncNow();
  } else if (type === "comment" || type === "reel_comment") {
    window.clearTimeout(commentTimer);
    commentTimer = window.setTimeout(() => void syncNow(), COMMENT_DELAY);
  } else void syncNow();
}

/** Cancel a queued comment that the user deleted before it was synced. Returns true if cancelled. */
export async function cancelQueuedComment(commentId: string) {
  const all = await queueAll();
  const hit = all.find((a) => (a.type === "comment" || a.type === "reel_comment") && a.payload?.id === commentId);
  if (!hit) return false;
  await queueDelete(hit.id);
  await refreshCounts();
  return true;
}

/** Whether a toggle (like/save/...) is still waiting locally — UI uses this so a refetch doesn't revert it. */
export async function pendingStateFor(key: string): Promise<ActionType | null> {
  const a = await queueFindByKey(key);
  return (a?.type as ActionType) || null;
}

const executors: Record<ActionType, (p: any) => Promise<void>> = {
  like: async (p) => {
    await throwOn(supabase.from("likes").upsert({ user_id: p.user_id, post_id: p.post_id }, { onConflict: "user_id,post_id", ignoreDuplicates: true }));
  },
  unlike: async (p) => {
    await throwOn(supabase.from("likes").delete().eq("user_id", p.user_id).eq("post_id", p.post_id));
  },
  save: async (p) => {
    await throwOn(supabase.from("saves").upsert({ user_id: p.user_id, post_id: p.post_id }, { onConflict: "user_id,post_id", ignoreDuplicates: true }));
  },
  unsave: async (p) => {
    await throwOn(supabase.from("saves").delete().eq("user_id", p.user_id).eq("post_id", p.post_id));
  },
  repost: async (p) => {
    await throwOn(supabase.from("reposts").upsert({ user_id: p.user_id, post_id: p.post_id }, { onConflict: "user_id,post_id", ignoreDuplicates: true }));
  },
  unrepost: async (p) => {
    await throwOn(supabase.from("reposts").delete().eq("user_id", p.user_id).eq("post_id", p.post_id));
  },
  follow: async (p) => {
    const { data } = await supabase.from("follows").select("id").eq("follower_id", p.follower_id).eq("following_id", p.following_id).maybeSingle();
    if (!data) await throwOn(supabase.from("follows").insert({ follower_id: p.follower_id, following_id: p.following_id }));
  },
  unfollow: async (p) => {
    await throwOn(supabase.from("follows").delete().eq("follower_id", p.follower_id).eq("following_id", p.following_id));
  },
  comment: async (p) => {
    // client-generated id makes retries idempotent
    await throwOn(
      supabase.from("comments").upsert(
        { id: p.id, post_id: p.post_id, user_id: p.user_id, content: p.content, parent_id: p.parent_id ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      ),
    );
  },
  reel_comment: async (p) => {
    await throwOn(
      supabase.from("reel_comments").upsert({ id: p.id, reel_id: p.reel_id, user_id: p.user_id, content: p.content }, { onConflict: "id", ignoreDuplicates: true }),
    );
  },
  profile_update: async (p) => {
    await throwOn(supabase.from("profiles").update(p.values).eq("user_id", p.user_id));
  },
};

async function throwOn(builder: any) {
  const { error } = await builder;
  if (error) throw new Error(error.message);
}

let syncing = false;

/** Flush the pending queue with exponential backoff. Safe to call repeatedly. */
export async function syncNow() {
  if (syncing || !state.online) return;
  syncing = true;
  setState({ syncing: true });
  try {
    const all = (await queueAll()).sort((a, b) => a.createdAt - b.createdAt);
    for (const action of all) {
      if (!navigator.onLine) break;
      if (action.nextAttemptAt > Date.now()) continue;
      const run = executors[action.type as ActionType];
      if (!run) {
        await queueDelete(action.id);
        continue;
      }
      try {
        await run(action.payload);
        await queueDelete(action.id);
      } catch (e: any) {
        const attempts = action.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await queueDelete(action.id);
        } else {
          await queuePut({
            ...action,
            attempts,
            lastError: e?.message || "Sync failed",
            nextAttemptAt: Date.now() + BASE_DELAY * 2 ** (attempts - 1),
          });
        }
      }
    }
  } finally {
    syncing = false;
    setState({ syncing: false });
    await refreshCounts();
  }
}

export async function retryFailed() {
  const all = await queueAll();
  await Promise.all(all.map((a) => queuePut({ ...a, attempts: 0, nextAttemptAt: Date.now() })));
  await syncNow();
}

let started = false;

/** Wire up connectivity listeners + periodic retry. Call once at app boot. */
export function startOfflineEngine() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refreshCounts();
  const goOnline = () => {
    setState({ online: true });
    void syncNow();
  };
  const goOffline = () => setState({ online: false });
  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);
  // flush when the user leaves / backgrounds the app
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && navigator.onLine) void syncNow();
  });
  window.addEventListener("pagehide", () => { if (navigator.onLine) void syncNow(); });
  // periodic batch flush (also covers retry backoff windows)
  window.setInterval(() => {
    if (navigator.onLine && state.pending > 0) void syncNow();
  }, BATCH_INTERVAL);
  if (navigator.onLine) void syncNow();
}