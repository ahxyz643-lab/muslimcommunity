import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Upload, Loader2, Music, Type, Sparkles, Scissors, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadVideoToTelegram, validateVideo } from "@/lib/video";

const FILTERS = [
  { id: "none", label: "Original", css: "" },
  { id: "warm", label: "Warm", css: "sepia(0.3) saturate(1.4) hue-rotate(-10deg)" },
  { id: "cool", label: "Cool", css: "saturate(1.2) hue-rotate(15deg) brightness(1.05)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(1.1) brightness(0.95)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.15)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.9)" },
];

const MUSIC_TRACKS = [
  "Calm Nasheed - Traditional",
  "Quran Recitation - Soft",
  "Inspirational Beat",
  "Acoustic Guitar",
  "Ambient Vibes",
  "Original Audio",
];

type Step = "select" | "trim" | "edit";

const CreateReel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [caption, setCaption] = useState("");
  const [filter, setFilter] = useState("none");
  const [music, setMusic] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "PREPARING" | "UPLOADING" | "PROCESSING" | "READY" | "FAILED">("IDLE");
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Reuse the same Telegram file across retries so we never double-upload.
  const uploadedFileIdRef = useRef<string | null>(null);
  const [activePanel, setActivePanel] = useState<"filter" | "music" | "text" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // Loop the trimmed segment
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit") return;
    const onTime = () => { if (v.currentTime >= trimEnd) v.currentTime = trimStart; };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [trimStart, trimEnd, step]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const invalid = validateVideo(f);
    if (invalid) {
      toast({ title: "Can't use this video", description: invalid, variant: "destructive" });
      return;
    }
    uploadedFileIdRef.current = null;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("trim");
  };

  const onLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    setDuration(d);
    setTrimStart(0);
    setTrimEnd(Math.min(d, 60));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.currentTime = trimStart; v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const handlePost = async () => {
    if (!file) return;
    setPosting(true);
    setUploadError(null);
    try {
      // Read the session at submit time instead of trusting a stale context user.
      // Supabase evaluates reels INSERT policies from the access token attached to this client.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const currentUser = authData.user;
      if (authError || !currentUser) {
        throw new Error("Your session expired. Please sign in again.");
      }

      let fileId = uploadedFileIdRef.current;
      if (!fileId) {
        setStatus("PREPARING");
        setProgress(0);
        setStatus("UPLOADING");
        fileId = await uploadVideoToTelegram(file, {
          caption: caption.trim() || undefined,
          onProgress: setProgress,
        });
        uploadedFileIdRef.current = fileId;
      }
      setStatus("PROCESSING");

      const { error } = await supabase.from("reels").insert({
        user_id: currentUser.id,
        video_url: "",
        telegram_file_id: fileId,
        caption: caption.trim() || null,
        music_name: music,
        filter: filter === "none" ? null : filter,
        text_overlay: textOverlay.trim() || null,
        duration_seconds: Math.round(trimEnd - trimStart),
      });
      if (error) throw error;

      setStatus("READY");
      toast({ title: "Reel shared! ✨" });
      navigate("/reels");
    } catch (err: any) {
      console.error("[CreateReel]", err);
      setStatus("FAILED");
      const rawMessage = err?.message || "";
      const msg = /too large|supported video|session expired|cancelled|couldn't upload|Network error/i.test(rawMessage)
        ? rawMessage
        : "We couldn't upload your video. Please try again.";
      setUploadError(msg);
      toast({ title: "We couldn't publish your reel", description: msg, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const currentFilterCss = FILTERS.find((f) => f.id === filter)?.css || "";

  // Step 1: Select video
  if (step === "select") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><X className="h-6 w-6" /></button>
          <h1 className="text-base font-bold text-white">New Reel</h1>
          <div className="w-6" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-white/30 px-12 py-16 transition-all hover:border-primary hover:bg-white/5"
          >
            <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-2xl shadow-glow">
              <Upload className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Upload a video</p>
              <p className="mt-1 text-xs text-white/60">MP4, MOV up to 20MB · max 60s</p>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>
    );
  }

  // Step 2: Trim
  if (step === "trim") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => { setFile(null); setPreviewUrl(null); setStep("select"); }} className="text-white">
            <X className="h-6 w-6" />
          </button>
          <h1 className="text-base font-bold text-white">Trim</h1>
          <button
            onClick={() => setStep("edit")}
            className="rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            Next
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4">
          <video
            ref={videoRef}
            src={previewUrl!}
            onLoadedMetadata={onLoadedMeta}
            playsInline
            controls
            className="max-h-full max-w-full rounded-2xl"
          />
        </div>

        <div className="space-y-3 px-4 pb-6 pt-4">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Scissors className="h-3.5 w-3.5" />
            <span>Trim: {trimStart.toFixed(1)}s — {trimEnd.toFixed(1)}s ({(trimEnd - trimStart).toFixed(1)}s)</span>
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Start</label>
            <input
              type="range" min={0} max={duration} step={0.1}
              value={trimStart}
              onChange={(e) => {
                const v = Math.min(parseFloat(e.target.value), trimEnd - 1);
                setTrimStart(v);
                if (videoRef.current) videoRef.current.currentTime = v;
              }}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">End</label>
            <input
              type="range" min={0} max={duration} step={0.1}
              value={trimEnd}
              onChange={(e) => {
                const v = Math.max(parseFloat(e.target.value), trimStart + 1);
                setTrimEnd(Math.min(v, trimStart + 60));
              }}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Edit (filters, music, text, caption)
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setStep("trim")} className="text-white"><X className="h-6 w-6" /></button>
        <h1 className="text-base font-bold text-white">Edit Reel</h1>
        <button
          onClick={handlePost}
          disabled={posting}
          className="rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
        </button>
      </div>

      {/* Preview */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          src={previewUrl!}
          autoPlay
          loop
          playsInline
          muted
          onClick={togglePlay}
          className="h-full w-full object-contain"
          style={{ filter: currentFilterCss }}
        />
        {textOverlay && (
          <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 max-w-[80%]">
            <p className="text-center text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {textOverlay}
            </p>
          </div>
        )}

        {/* Tool rail */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={() => setActivePanel(activePanel === "filter" ? null : "filter")}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md ${activePanel === "filter" ? "bg-primary text-primary-foreground" : "bg-black/40 text-white"}`}
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "music" ? null : "music")}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md ${activePanel === "music" ? "bg-primary text-primary-foreground" : "bg-black/40 text-white"}`}
          >
            <Music className="h-5 w-5" />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "text" ? null : "text")}
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md ${activePanel === "text" ? "bg-primary text-primary-foreground" : "bg-black/40 text-white"}`}
          >
            <Type className="h-5 w-5" />
          </button>
        </div>

        {/* Music indicator */}
        {music && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
            <Music className="h-3.5 w-3.5 text-white" />
            <span className="text-xs text-white">{music}</span>
          </div>
        )}
      </div>

      {/* Panels */}
      {activePanel === "filter" && (
        <div className="border-t border-white/10 bg-black/80 p-4 backdrop-blur-xl">
          <p className="mb-3 text-xs font-semibold text-white/70">FILTERS</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex flex-shrink-0 flex-col items-center gap-1.5 ${filter === f.id ? "scale-105" : ""}`}
              >
                <div
                  className={`h-16 w-16 overflow-hidden rounded-xl ring-2 ${filter === f.id ? "ring-primary" : "ring-transparent"}`}
                >
                  <video
                    src={previewUrl!}
                    muted
                    className="h-full w-full object-cover"
                    style={{ filter: f.css }}
                  />
                </div>
                <span className="text-[10px] text-white">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activePanel === "music" && (
        <div className="max-h-64 overflow-y-auto border-t border-white/10 bg-black/80 p-4 backdrop-blur-xl">
          <p className="mb-3 text-xs font-semibold text-white/70">MUSIC</p>
          <div className="space-y-1">
            <button
              onClick={() => setMusic(null)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${!music ? "bg-primary/20" : "hover:bg-white/5"}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
                <X className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm text-white">No music</span>
            </button>
            {MUSIC_TRACKS.map((t) => (
              <button
                key={t}
                onClick={() => setMusic(t)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${music === t ? "bg-primary/20" : "hover:bg-white/5"}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent">
                  <Music className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-sm text-white">{t}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activePanel === "text" && (
        <div className="border-t border-white/10 bg-black/80 p-4 backdrop-blur-xl">
          <p className="mb-2 text-xs font-semibold text-white/70">TEXT OVERLAY</p>
          <input
            type="text"
            value={textOverlay}
            onChange={(e) => setTextOverlay(e.target.value)}
            placeholder="Add text on video..."
            maxLength={50}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Caption */}
      <div className="border-t border-white/10 bg-black p-3">
        {status !== "IDLE" && status !== "READY" && (
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>
                {status === "PREPARING" && "Preparing video..."}
                {status === "UPLOADING" && `Uploading ${progress}%`}
                {status === "PROCESSING" && "Processing..."}
                {status === "FAILED" && (uploadError || "Upload failed")}
              </span>
              {status === "FAILED" && (
                <div className="flex gap-2">
                  <button onClick={handlePost} className="rounded-lg bg-primary px-3 py-1 font-semibold text-primary-foreground">Retry</button>
                  <button onClick={() => { setStatus("IDLE"); setUploadError(null); }} className="rounded-lg bg-white/10 px-3 py-1 text-white">Cancel</button>
                </div>
              )}
            </div>
            {status !== "FAILED" && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-primary transition-all" style={{ width: `${status === "UPLOADING" ? progress : 100}%` }} />
              </div>
            )}
          </div>
        )}
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          maxLength={200}
          className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>
    </div>
  );
};

export default CreateReel;
