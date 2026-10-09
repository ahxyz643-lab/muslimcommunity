import type { QueryClient } from "@tanstack/react-query";
import { cacheSet } from "@/lib/offline/db";

export type ProfileListKind = "liked" | "saved";
export const profileListKey = (kind: ProfileListKind, userId: string) => [`${kind}-posts`, userId];
export const profileListCacheKey = (kind: ProfileListKind, userId: string) => `profile:${kind}:${userId}`;

let qcRef: QueryClient | null = null;
export const bindProfileLists = (qc: QueryClient) => { qcRef = qc; };

/** Add/remove a post locally after like/save toggles — no DB refetch. */
export function patchProfileList(kind: ProfileListKind, userId: string, post: any, on: boolean) {
  if (!qcRef) return;
  const key = profileListKey(kind, userId);
  const prev = qcRef.getQueryData<any[]>(key);
  if (!prev) return; // list never loaded; it'll fetch fresh when opened
  const without = prev.filter((p) => p.id !== post.id);
  const next = on ? [post, ...without] : without;
  qcRef.setQueryData(key, next);
  void cacheSet(profileListCacheKey(kind, userId), next);
}
