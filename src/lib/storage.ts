import { supabase } from "@/integrations/supabase/client";

/**
 * Storage RLS requires the FIRST path segment to be the owner's user id.
 * Always build paths through this helper so uploads never violate the policy.
 */
export function userStoragePath(userId: string, folder: string, fileName: string) {
  const ext = (fileName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${userId}/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext || "bin"}`;
}

/** Upload a file into the owner-scoped folder and return its public URL. */
export async function uploadUserFile(
  bucket: string,
  userId: string,
  folder: string,
  file: Blob & { name?: string; type?: string },
  fileName?: string,
): Promise<string> {
  const path = userStoragePath(userId, folder, fileName || (file as any).name || "file.bin");
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
