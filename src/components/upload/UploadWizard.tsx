import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, UploadCloud } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadManager, type ContentType, type Draft } from "@/lib/upload/UploadManager";
import InstagramStyleCamera, { type CameraMode } from "./InstagramStyleCamera";
import ContentTypeSelector from "./ContentTypeSelector";
import ContentDetails from "./ContentDetails";
import ReviewStep from "./ReviewStep";
import { isVideoFile } from "./MediaPreview";

type Step = "camera" | "type" | "details" | "review";
const ORDER: Step[] = ["camera", "type", "details", "review"];

const emptyDraft = (t: ContentType): Draft => ({ contentType: t, title: "", caption: "", hashtags: "", mentions: "", audience: "public", commentsEnabled: true });

/** The single upload flow used by Home, Reels and Profile. */
const UploadWizard = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const initialMode = (params.get("mode") as CameraMode) || "photo";

  const [step, setStep] = useState<Step>("camera");
  const [media, setMedia] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [type, setType] = useState<ContentType | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft("video_post"));

  const hasVideo = !!media && isVideoFile(media);

  const validate = (): string | null => {
    const t = draft.contentType;
    if (["job", "announcement", "support"].includes(t) && !draft.title.trim()) return "Please add a title.";
    if (t === "sports" && !draft.sport?.trim() && !draft.event?.trim()) return "Add the sport or event.";
    if ((t === "reel" || t === "video_post") && !media && !draft.caption.trim() && !draft.title.trim()) return "Add some text or media.";
    return null;
  };

  const next = () => {
    if (step === "type") {
      if (!type) return toast({ title: "Choose what you're uploading", variant: "destructive" });
      if (draft.contentType !== type) setDraft({ ...emptyDraft(type), caption: draft.caption, hashtags: draft.hashtags, mentions: draft.mentions });
    }
    if (step === "details") {
      const err = validate();
      if (err) return toast({ title: err, variant: "destructive" });
    }
    setStep(ORDER[ORDER.indexOf(step) + 1]);
  };
  const back = () => (step === "type" ? setStep("camera") : setStep(ORDER[ORDER.indexOf(step) - 1]));

  const upload = () => {
    if (!user) return;
    uploadManager.start(user.id, draft, media, cover);
    toast({ title: "Upload started", description: "You can keep using the app while it finishes." });
    navigate("/", { replace: true });
  };

  if (step === "camera") {
    return (
      <InstagramStyleCamera
        initialMode={initialMode}
        onClose={() => navigate(-1)}
        onContinue={(file, mode) => {
          setMedia(file);
          if (!type) setType(mode === "reel" && file && isVideoFile(file) ? "reel" : file ? "video_post" : "announcement");
          setStep("type");
        }}
      />
    );
  }

  const idx = ORDER.indexOf(step);
  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between border-b border-border px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex gap-1.5" aria-label={`Step ${idx + 1} of 4`}>
          {ORDER.map((s, i) => <span key={s} className={`h-1.5 w-8 rounded-full ${i <= idx ? "bg-primary" : "bg-secondary"}`} />)}
        </div>
        <span className="w-10 text-right text-xs text-muted-foreground">{idx + 1}/4</span>
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-5">
        {step === "type" && <ContentTypeSelector value={type} onChange={setType} hasVideo={hasVideo} />}
        {step === "details" && <ContentDetails draft={draft} setDraft={setDraft} cover={cover} setCover={setCover} media={media} />}
        {step === "review" && <ReviewStep draft={draft} media={media} cover={cover} onEdit={() => setStep("details")} />}
      </div>

      <div className="mx-auto flex w-full max-w-lg gap-3 border-t border-border px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
        <button onClick={back} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold text-foreground">Back</button>
        {step === "review" ? (
          <button onClick={upload} className="gradient-primary flex flex-[2] items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            <UploadCloud className="h-4 w-4" /> Upload
          </button>
        ) : (
          <button onClick={next} className="gradient-primary flex flex-[2] items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadWizard;
