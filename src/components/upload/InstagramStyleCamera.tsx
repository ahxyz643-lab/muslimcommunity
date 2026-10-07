import { useCallback, useEffect, useRef, useState } from "react";
import { X, Zap, ZapOff, SwitchCamera, Settings2, Pause, Play, ArrowRight, RotateCcw, Type } from "lucide-react";
import MediaPicker from "./MediaPicker";
import MediaPreview from "./MediaPreview";
import { validateVideo } from "@/lib/video";

export type CameraMode = "photo" | "video" | "reel";

type Props = {
  onClose: () => void;
  onContinue: (file: File | null, mode: CameraMode) => void;
  initialMode?: CameraMode;
};

const REEL_MAX = 60;
const VIDEO_MAX = 180;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Full-screen capture step: live camera, photo/video/reel modes, gallery, preview. */
const InstagramStyleCamera = ({ onClose, onContinue, initialMode = "photo" }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const holdTimer = useRef<number>();
  const heldRef = useRef(false);

  const [mode, setMode] = useState<CameraMode>(initialMode);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [flash, setFlash] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [grid, setGrid] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [pickError, setPickError] = useState<string | null>(null);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };

  const startStream = useCallback(async () => {
    stopStream();
    setCamError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: mode !== "photo",
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      const caps: any = s.getVideoTracks()[0]?.getCapabilities?.() || {};
      setTorchOk(!!caps.torch);
    } catch (e: any) {
      setCamError(e?.name === "NotAllowedError" ? "Camera access was blocked. Allow it in your browser, or pick from your gallery." : "No camera available. You can still pick from your gallery.");
    }
  }, [facing, mode]);

  useEffect(() => { if (!file) void startStream(); return () => { if (!recRef.current) stopStream(); }; }, [startStream, file]);
  useEffect(() => () => stopStream(), []);

  useEffect(() => {
    const t = streamRef.current?.getVideoTracks()[0] as any;
    if (t && torchOk) t.applyConstraints({ advanced: [{ torch: flash }] }).catch(() => {});
  }, [flash, torchOk]);

  useEffect(() => {
    if (!recording || paused) return;
    const iv = window.setInterval(() => setElapsed((e) => {
      const n = e + 0.1;
      if (n >= (mode === "reel" ? REEL_MAX : VIDEO_MAX)) stopRecording();
      return n;
    }), 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, paused, mode]);

  const takePhoto = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user" && mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    if (flash && !torchOk) { /* screen flash fallback */ document.body.animate([{ filter: "brightness(3)" }, { filter: "none" }], 250); }
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && setFile(new File([b], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })), "image/jpeg", 0.92);
  };

  const startRecording = () => {
    const s = streamRef.current;
    if (!s || typeof MediaRecorder === "undefined") return;
    const mime = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      setFile(new File(chunks.current, `${mode}-${Date.now()}.${ext}`, { type }));
      recRef.current = null;
      stopStream();
    };
    rec.start(250);
    recRef.current = rec;
    setElapsed(0); setPaused(false); setRecording(true);
  };

  function stopRecording() {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    setRecording(false); setPaused(false);
  }

  const togglePause = () => {
    const r = recRef.current;
    if (!r) return;
    if (r.state === "recording" && typeof r.pause === "function") { r.pause(); setPaused(true); }
    else if (r.state === "paused") { r.resume(); setPaused(false); }
  };

  const onPressStart = () => {
    if (mode === "photo") return;
    heldRef.current = false;
    if (recording) return;
    holdTimer.current = window.setTimeout(() => { heldRef.current = true; startRecording(); }, 250);
  };
  const onPressEnd = () => {
    clearTimeout(holdTimer.current);
    if (mode === "photo") { void takePhoto(); return; }
    if (heldRef.current) { heldRef.current = false; stopRecording(); return; }
    if (recording) stopRecording(); else startRecording();
  };

  const onPick = (f: File) => {
    setPickError(null);
    if (f.type.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name)) {
      const err = validateVideo(f);
      if (err) { setPickError(err); return; }
      if (mode === "photo") setMode("video");
    } else if (f.size > 10 * 1024 * 1024) { setPickError("Photos must be under 10MB."); return; }
    else if (mode !== "photo") setMode("photo");
    stopStream();
    setFile(f);
  };

  const ctrl = "flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur";

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black text-white">
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <button aria-label="Close camera" onClick={() => { stopRecording(); stopStream(); onClose(); }} className={ctrl}><X className="h-6 w-6" /></button>
        {!file && (
          <div className="flex gap-2">
            <button aria-label={flash ? "Flash on" : "Flash off"} onClick={() => setFlash((f) => !f)} className={ctrl}>
              {flash ? <Zap className="h-5 w-5 fill-current text-accent" /> : <ZapOff className="h-5 w-5" />}
            </button>
            <button aria-label="Flip camera" disabled={recording} onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className={ctrl}><SwitchCamera className="h-5 w-5" /></button>
            <button aria-label="Camera settings" onClick={() => setShowSettings((s) => !s)} className={ctrl}><Settings2 className="h-5 w-5" /></button>
          </div>
        )}
      </div>

      {showSettings && !file && (
        <div className="absolute right-4 top-20 z-20 w-56 space-y-3 rounded-2xl bg-black/80 p-4 text-sm backdrop-blur">
          <label className="flex items-center justify-between">Grid lines <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /></label>
          <label className="flex items-center justify-between">Mirror front camera <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /></label>
          <p className="text-xs text-white/60">Reels up to {REEL_MAX}s · Videos up to {VIDEO_MAX / 60} min</p>
        </div>
      )}

      {/* Center */}
      <div className="relative flex-1 overflow-hidden">
        {file ? (
          <MediaPreview file={file} className="h-full w-full" />
        ) : camError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-sm text-white/80">
            <p>{camError}</p>
            <button onClick={() => void startStream()} className="rounded-full border border-white/30 px-4 py-2">Try again</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" style={{ transform: facing === "user" && mirror ? "scaleX(-1)" : undefined }} />
            {grid && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_33%,rgba(255,255,255,.25)_33%,rgba(255,255,255,.25)_calc(33%+1px),transparent_calc(33%+1px),transparent_66%,rgba(255,255,255,.25)_66%,rgba(255,255,255,.25)_calc(66%+1px),transparent_calc(66%+1px)),linear-gradient(90deg,transparent_33%,rgba(255,255,255,.25)_33%,rgba(255,255,255,.25)_calc(33%+1px),transparent_calc(33%+1px),transparent_66%,rgba(255,255,255,.25)_66%,rgba(255,255,255,.25)_calc(66%+1px),transparent_calc(66%+1px))]" />}
          </>
        )}
        {recording && (
          <div className="absolute left-1/2 top-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-destructive px-3 py-1 text-sm font-semibold tabular-nums">
            <span className={`h-2 w-2 rounded-full bg-white ${paused ? "" : "animate-pulse"}`} />
            {fmt(elapsed)} / {fmt(mode === "reel" ? REEL_MAX : VIDEO_MAX)}
          </div>
        )}
        {pickError && <p className="absolute inset-x-6 bottom-4 rounded-xl bg-destructive/90 p-3 text-center text-sm">{pickError}</p>}
      </div>

      {/* Bottom */}
      <div className="pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
        {file ? (
          <div className="flex items-center justify-between px-6">
            <button onClick={() => setFile(null)} className="flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold">
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button onClick={() => onContinue(file, mode)} className="gradient-primary flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-8">
              <MediaPicker onPick={onPick} className={`${ctrl} h-12 w-12 rounded-xl border-2 border-white/70`} />
              <button
                aria-label={mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording (tap or hold)"}
                onPointerDown={onPressStart}
                onPointerUp={onPressEnd}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!!camError}
                className="flex h-20 w-20 touch-none select-none items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
              >
                <span className={`block transition-all ${mode === "photo" ? "h-16 w-16 rounded-full bg-white" : recording ? "h-8 w-8 rounded-md bg-destructive" : "h-16 w-16 rounded-full bg-destructive"}`} />
              </button>
              {recording ? (
                <button aria-label={paused ? "Resume" : "Pause"} onClick={togglePause} className={ctrl}>{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>
              ) : (
                <button aria-label="Continue without media" onClick={() => { stopStream(); onContinue(null, mode); }} className={`${ctrl} h-12 w-12`} title="Text only">
                  <Type className="h-5 w-5" />
                </button>
              )}
            </div>
            {!recording && (
              <div role="tablist" aria-label="Camera mode" className="mt-4 flex justify-center gap-6 text-sm font-semibold uppercase tracking-wider">
                {(["photo", "video", "reel"] as CameraMode[]).map((m) => (
                  <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={mode === m ? "text-accent" : "text-white/60"}>{m}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InstagramStyleCamera;
