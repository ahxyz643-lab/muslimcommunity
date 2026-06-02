import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVideoSrc } from "@/lib/video";

interface ReelPreview {
  id: string;
  video_url: string;
  telegram_file_id: string | null;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

const ReelsPreviewBar = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState<ReelPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("reels").select("id, video_url, telegram_file_id, user_id").order("created_at", { ascending: false }).limit(8);
      if (!data?.length) { setLoading(false); return; }
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", userIds);
      const map = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setReels(data.map((r) => ({
        id: r.id, video_url: r.video_url, telegram_file_id: r.telegram_file_id, user_id: r.user_id,
        username: map.get(r.user_id)?.username || null,
        avatar_url: map.get(r.user_id)?.avatar_url || null,
      })));
      setLoading(false);
    })();
  }, []);

  if (loading || reels.length === 0) return null;

  return (
    <div className="border-b border-border px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Play className="h-4 w-4 fill-primary text-primary" />
          <h2 className="text-sm font-bold text-foreground">Reels</h2>
        </div>
        <button onClick={() => navigate("/reels")} className="text-xs font-medium text-primary">See all</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => navigate("/reels/create")}
          className="flex h-40 w-28 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 transition-all hover:border-primary hover:bg-secondary"
        >
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl shadow-glow">
            <Plus className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-[11px] font-medium text-foreground">Create</span>
        </button>
        {reels.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate("/reels")}
            className="group relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary"
          >
            <video
              src={getVideoSrc(r)}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5">
              <img
                src={r.avatar_url || "https://i.pravatar.cc/150"}
                alt=""
                className="h-5 w-5 rounded-full object-cover ring-1 ring-white/60"
              />
              <span className="truncate text-[10px] font-medium text-white drop-shadow-md">@{r.username || "user"}</span>
            </div>
            <div className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1 backdrop-blur-sm">
              <Play className="h-3 w-3 fill-white text-white" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReelsPreviewBar;
