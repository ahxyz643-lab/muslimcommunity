import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "mc-offline";
const DB_VERSION = 1;

export type QueuedAction = {
  id: string;
  /** dedupe key — a newer action with the same key replaces the older one */
  key: string;
  type: string;
  payload: any;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  lastError?: string;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
        if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
      },
    }).catch((e) => {
      console.warn("[offline] IndexedDB unavailable", e);
      throw e;
    });
  }
  return dbPromise;
}

/** Reset a corrupted database. */
export async function resetOfflineDB() {
  try {
    dbPromise = null;
    await indexedDB.deleteDatabase(DB_NAME);
  } catch (e) {
    console.warn("[offline] reset failed", e);
  }
}

type Entry<T> = { value: T; savedAt: number };

export async function cacheSet<T>(key: string, value: T) {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put("cache", { value, savedAt: Date.now() } as Entry<T>, key);
  } catch (e: any) {
    if (e?.name === "QuotaExceededError") await pruneCache();
    else console.warn("[offline] cacheSet failed", e);
  }
}

export async function cacheGet<T>(key: string, maxAgeMs?: number): Promise<T | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    const entry = (await db.get("cache", key)) as Entry<T> | undefined;
    if (!entry) return null;
    if (maxAgeMs && Date.now() - entry.savedAt > maxAgeMs) return null;
    return entry.value;
  } catch (e) {
    console.warn("[offline] cacheGet failed", e);
    return null;
  }
}

/** Drop the oldest half of cached entries when storage is tight. */
export async function pruneCache() {
  try {
    const db = await getDB();
    if (!db) return;
    const keys = await db.getAllKeys("cache");
    const drop = keys.slice(0, Math.ceil(keys.length / 2));
    await Promise.all(drop.map((k) => db.delete("cache", k)));
  } catch (e) {
    console.warn("[offline] pruneCache failed", e);
  }
}

export async function queueAll(): Promise<QueuedAction[]> {
  try {
    const db = await getDB();
    if (!db) return [];
    return (await db.getAll("queue")) as QueuedAction[];
  } catch {
    return [];
  }
}

export async function queuePut(action: QueuedAction) {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put("queue", action);
  } catch (e) {
    console.warn("[offline] queuePut failed", e);
  }
}

export async function queueDelete(id: string) {
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete("queue", id);
  } catch (e) {
    console.warn("[offline] queueDelete failed", e);
  }
}

export async function queueFindByKey(key: string) {
  const all = await queueAll();
  return all.find((a) => a.key === key) || null;
}