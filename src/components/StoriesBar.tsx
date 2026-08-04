import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2 } from "lucide-react";

type StoryProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  stories: { id: string; media_url: string | null; media_type: string; created_at: string }[];
};

const StoriesBar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<{ profile: StoryProfile; idx: number } | null>(null);

  const { data: grouped = [] } = useQuery<StoryProfile[]>({
    queryKey: ["stories-active"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: stories } = await supabase
        .from("stories")
        .select("id, user_id, image_url, caption, created_at, expires_at")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: true });
      if (!stories || stories.length === 0) return [];
      const userIds = [...new Set(stories.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      const byUser = new Map<string, StoryProfile>();
      for (const p of profiles || []) {
        byUser.set(p.user_id, { ...(p as any), stories: [] });
      }
      for (const s of stories as any[]) {
        const g = byUser.get(s.user_id);
        if (!g) continue;
        const url: string = s.image_url || "";
        const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
        g.stories.push({ id: s.id, media_url: url, media_type: isVideo ? "video" : "image", created_at: s.created_at });
      }
      return Array.from(byUser.values());
    },
  });

  const currentProfile = grouped.find((g) => g.user_id === user?.id);
  const otherProfiles = grouped.filter((g) => g.user_id !== user?.id);

  const uploadStory = async (file: File) => {
    if (!user) { toast({ title: "Sign in to add a story" }); return; }
    if (file.size > 20 * 1024 * 1024) { toast({ title: "File too large", description: "Max 20MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      // Upload to Storage first (public URL) so viewer can display it,
      // and archive a copy in Telegram bot #2 for admin backup.
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `stories/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);

      // Fire-and-forget: archive to Telegram bot #2 so channel gets a copy.
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("caption", `Story by @${user.email || user.id}`);
        form.append("bot", "b2");
        supabase.functions.invoke("telegram-upload", { body: form }).catch(() => {});
      } catch {}

      const { error: insErr } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: pub.publicUrl,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (insErr) throw insErr;
      toast({ title: "Story posted — visible for 24 hours" });
      qc.invalidateQueries({ queryKey: ["stories-active"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        {/* Your Story */}
        <button onClick={() => user ? fileRef.current?.click() : toast({ title: "Sign in to add a story" })} aria-label="Add story" className="flex flex-col items-center gap-1">
          <div className="relative h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
            <img
              src={currentProfile?.avatar_url || user?.user_metadata?.avatar_url || "https://i.pravatar.cc/150"}
              alt="Your story"
              className="h-full w-full rounded-full border-2 border-card object-cover"
            />
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin text-primary-foreground"/> : <span className="text-xs text-primary-foreground font-bold">+</span>}
            </div>
          </div>
          <span className="w-16 truncate text-center text-[11px] text-muted-foreground">Your Story</span>
        </button>
        {currentProfile && (
          <button onClick={() => setViewer({ profile: currentProfile, idx: 0 })} className="flex flex-col items-center gap-1">
            <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
              <img src={currentProfile.avatar_url || "https://i.pravatar.cc/150"} alt="Your story" className="h-full w-full rounded-full border-2 border-card object-cover"/>
            </div>
            <span className="w-16 truncate text-center text-[11px] text-muted-foreground">You</span>
          </button>
        )}
        {otherProfiles.map((p) => (
          <button key={p.user_id} onClick={() => setViewer({ profile: p, idx: 0 })} className="flex flex-col items-center gap-1">
            <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
              <img src={p.avatar_url || "https://i.pravatar.cc/150"} alt={p.display_name || ""} className="h-full w-full rounded-full border-2 border-card object-cover"/>
            </div>
            <span className="w-16 truncate text-center text-[11px] text-muted-foreground">{p.username?.split("_")[0] || "user"}</span>
          </button>
        ))}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadStory(f); }}
        />
      </div>

      {viewer && <StoryViewer profile={viewer.profile} startIdx={viewer.idx} onClose={() => setViewer(null)} />}
    </>
  );
};

const StoryViewer = ({ profile, startIdx, onClose }: { profile: StoryProfile; startIdx: number; onClose: () => void }) => {
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const stories = profile.stories;
  const current = stories[idx];
  const DURATION_MS = 5000;

  useEffect(() => {
    if (!current) return;
    setProgress(0);
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(t);
        if (idx < stories.length - 1) setIdx(idx + 1);
        else onClose();
      }
    }, 50);
    return () => clearInterval(t);
  }, [idx, current, stories.length, onClose]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-3">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white transition-[width] duration-100" style={{ width: `${i < idx ? 100 : i === idx ? progress : 0}%` }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <img src={profile.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/40"/>
        <span className="text-sm font-semibold text-white">@{profile.username || "user"}</span>
        <button onClick={onClose} aria-label="Close" className="ml-auto text-white"><X className="h-6 w-6"/></button>
      </div>
      <div className="relative flex-1" onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isLeft = e.clientX - rect.left < rect.width / 2;
        if (isLeft) { if (idx > 0) setIdx(idx - 1); }
        else { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }
      }}>
        {current.media_type === "video" ? (
          <video src={current.media_url || ""} autoPlay playsInline muted={false} className="h-full w-full object-contain"/>
        ) : (
          <img src={current.media_url || ""} alt="Story" className="h-full w-full object-contain"/>
        )}
      </div>
    </div>
  );
};

export default StoriesBar;
