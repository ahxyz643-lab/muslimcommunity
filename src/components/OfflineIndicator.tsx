import { useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw, Cloud } from "lucide-react";
import { useOffline } from "@/hooks/useOffline";
import { retryFailed } from "@/lib/offline/queue";

const OfflineIndicator = () => {
  const { online, pending, syncing, failed } = useOffline();
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setBackOnline(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setBackOnline(true);
      const t = window.setTimeout(() => setBackOnline(false), 3000);
      return () => window.clearTimeout(t);
    }
  }, [online]);

  const show = !online || backOnline || (online && pending > 0);
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[90] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/60 bg-card/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-xl">
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
            <span>You're offline{pending > 0 ? ` · ${pending} pending` : ""}</span>
          </>
        ) : syncing ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Syncing {pending} change{pending === 1 ? "" : "s"}…</span>
          </>
        ) : pending > 0 ? (
          <>
            <Cloud className="h-3.5 w-3.5 text-accent" />
            <span>{pending} pending</span>
            {failed > 0 && (
              <button onClick={() => retryFailed()} className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <Cloud className="h-3.5 w-3.5 text-primary" />
            <span>Back online</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;