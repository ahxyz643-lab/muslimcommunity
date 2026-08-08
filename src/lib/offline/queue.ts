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
export async function enqueue(type: ActionType, key: string, payload: any) {
  const existing = await queueFindByKey(key);
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
  if (state.online) void syncNow();
}

const executors: Record<ActionType, (p: any) => Promise<void>> = {
  like: async (p) => {
    const { data } = await supabase.from("likes").select("id").eq("user_id", p.user_id).eq("post_id", p.post_id).maybeSingle();
    if (!data) await throwOn(supabase.from("likes").insert({ user_id: p.user_id, post_id: p.post_id }));
  },
  unlike: async (p) => {
    await throwOn(supabase.from("likes").delete().eq("user_id", p.user_id).eq("post_id", p.post_id));
  },
  save: async (p) => {
    const { data } = await supabase.from("saves").select("id").eq("user_id", p.user_id).eq("post_id", p.post_id).maybeSingle();
    if (!data) await throwOn(supabase.from("saves").insert({ user_id: p.user_id, post_id: p.post_id }));
  },
  unsave: async (p) => {
    await throwOn(supabase.from("saves").delete().eq("user_id", p.user_id).eq("post_id", p.post_id));
  },
  repost: async (p) => {
    const { data } = await supabase.from("reposts").select("id").eq("user_id", p.user_id).eq("post_id", p.post_id).maybeSingle();
    if (!data) await throwOn(supabase.from("reposts").insert({ user_id: p.user_id, post_id: p.post_id }));
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
    const { data } = await supabase.from("comments").select("id").eq("id", p.id).maybeSingle();
    if (!data)
      await throwOn(
        supabase.from("comments").insert({ id: p.id, post_id: p.post_id, user_id: p.user_id, content: p.content, parent_id: p.parent_id ?? null }),
      );
  },
  reel_comment: async (p) => {
    const { data } = await supabase.from("reel_comments").select("id").eq("id", p.id).maybeSingle();
    if (!data) await throwOn(supabase.from("reel_comments").insert({ id: p.id, reel_id: p.reel_id, user_id: p.user_id, content: p.content }));
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
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void syncNow();
  });
  // retry timer covers backoff windows and flaky connections
  window.setInterval(() => {
    if (navigator.onLine) void syncNow();
  }, 15000);
  if (navigator.onLine) void syncNow();
}