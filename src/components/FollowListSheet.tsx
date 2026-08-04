import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import VerifiedBadge from "@/components/VerifiedBadge";
import FollowButton from "@/components/FollowButton";

interface Row {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
}

const FollowListSheet = ({
  userId,
  mode,
  onClose,
}: {
  userId: string;
  mode: "followers" | "following";
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: follows } = mode === "followers"
        ? await supabase.from("follows").select("follower_id").eq("following_id", userId)
        : await supabase.from("follows").select("following_id").eq("follower_id", userId);
      const ids = (follows || []).map((f: any) => (mode === "followers" ? f.follower_id : f.following_id));
      if (ids.length === 0) {
        if (alive) { setRows([]); setLoading(false); }
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, verified")
        .in("user_id", ids);
      if (!alive) return;
      setRows((profiles as Row[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId, mode]);

  const open = (id: string) => {
    onClose();
    navigate(user?.id === id ? "/profile" : `/user/${id}`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {mode === "followers" ? "Followers" : "Following"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.user_id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => open(r.user_id)} className="flex flex-1 items-center gap-3 text-left">
                  <img
                    src={r.avatar_url || "https://i.pravatar.cc/150"}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{r.display_name || "User"}</span>
                      {r.verified && <VerifiedBadge size="sm" />}
                    </div>
                    <span className="text-xs text-muted-foreground">@{r.username || "user"}</span>
                  </div>
                </button>
                <FollowButton targetUserId={r.user_id} variant="outline" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListSheet;
