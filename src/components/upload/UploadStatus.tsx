import { useLocation } from "react-router-dom";
import { useUploads } from "@/hooks/useUploads";
import UploadProgress from "./UploadProgress";

/** Persistent floating upload card, mounted once at app level so it survives navigation. */
const UploadStatus = () => {
  const jobs = useUploads();
  const { pathname } = useLocation();
  if (!jobs.length || pathname.startsWith("/create") || pathname.startsWith("/admin")) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-[80] mx-auto max-w-lg space-y-2 px-3">
      {jobs.slice(0, 3).map((j) => (
        <div key={j.uploadId} className="pointer-events-auto"><UploadProgress job={j} /></div>
      ))}
    </div>
  );
};

export default UploadStatus;
