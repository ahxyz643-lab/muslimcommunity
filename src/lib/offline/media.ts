const MEDIA_CACHE = "offline-media";

/** True when this URL is already available in the browser cache (playable offline). */
export async function isMediaCached(url: string): Promise<boolean> {
  if (!url || typeof caches === "undefined") return false;
  try {
    const hit = await caches.match(url, { ignoreVary: true, ignoreSearch: false });
    return !!hit;
  } catch {
    return false;
  }
}

/** Explicitly download a video/image for offline playback. */
export async function saveForOffline(url: string): Promise<boolean> {
  if (!url || typeof caches === "undefined") return false;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    await cache.add(url);
    return true;
  } catch (e: any) {
    if (e?.name === "QuotaExceededError") {
      try {
        const cache = await caches.open(MEDIA_CACHE);
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.ceil(keys.length / 2)).map((k) => cache.delete(k)));
      } catch { /* ignore */ }
    }
    console.warn("[offline] saveForOffline failed", e);
    return false;
  }
}

export async function removeOffline(url: string) {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    await cache.delete(url);
  } catch { /* ignore */ }
}