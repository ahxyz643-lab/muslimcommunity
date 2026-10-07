import { Clapperboard, Film, Trophy, Briefcase, Megaphone, HandHeart } from "lucide-react";
import type { ContentType } from "@/lib/upload/UploadManager";

const OPTIONS: { value: ContentType; icon: typeof Film; label: string; hint: string; needsVideo?: boolean }[] = [
  { value: "reel", icon: Clapperboard, label: "Reel", hint: "Short vertical video", needsVideo: true },
  { value: "video_post", icon: Film, label: "Video Post", hint: "Photo or video with a title" },
  { value: "sports", icon: Trophy, label: "Sports", hint: "Match, score or event" },
  { value: "job", icon: Briefcase, label: "Job", hint: "Hire from the community" },
  { value: "announcement", icon: Megaphone, label: "Announcement", hint: "Share news or an event" },
  { value: "support", icon: HandHeart, label: "Support", hint: "Ask for help or donations" },
];

type Props = { value: ContentType | null; onChange: (v: ContentType) => void; hasVideo: boolean };

const ContentTypeSelector = ({ value, onChange, hasVideo }: Props) => (
  <div>
    <h2 className="font-serif text-2xl text-foreground">What are you uploading?</h2>
    <p className="mt-1 text-sm text-muted-foreground">Your choice decides the next details page.</p>
    <div className="mt-5 grid grid-cols-2 gap-3">
      {OPTIONS.map(({ value: v, icon: Icon, label, hint, needsVideo }) => {
        const disabled = needsVideo && !hasVideo;
        const active = value === v;
        return (
          <button
            key={v}
            disabled={disabled}
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all disabled:opacity-40 ${
              active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card/60 hover:border-primary/50"
            }`}
          >
            <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-accent"}`} />
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">{disabled ? "Needs a video" : hint}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export default ContentTypeSelector;
