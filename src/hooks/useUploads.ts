import { useSyncExternalStore } from "react";
import { uploadManager } from "@/lib/upload/UploadManager";

export function useUploads() {
  return useSyncExternalStore(uploadManager.subscribe, uploadManager.getJobs, uploadManager.getJobs);
}
