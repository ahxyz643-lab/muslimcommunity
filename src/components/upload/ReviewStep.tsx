import { Pencil } from "lucide-react";
import { CONTENT_LABELS, type Draft } from "@/lib/upload/UploadManager";
import MediaPreview from "./MediaPreview";

type Props = { draft: Draft; media: File | null; cover: File | null; onEdit: () => void };

const LABELS: Partial<Record<keyof Draft, string>> = {
  title: "Title", caption: "Caption / description", hashtags: "Hashtags", mentions: "Mentions",
  sport: "Sport", event: "Event", teams: "Teams", datetime: "Date & time", venue: "Venue", result: "Result",
  company: "Company", location: "Location", workMode: "Work mode", jobType: "Employment type", salary: "Salary",
  skills: "Skills", applyMethod: "How to apply", deadline: "Deadline",
  category: "Category", amount: "Amount", currency: "Currency", contact: "Contact",
};
const AUDIENCE = { public: "Everyone", followers: "Followers", private: "Only me" };

const ReviewStep = ({ draft, media, cover, onEdit }: Props) => {
  const rows = (Object.keys(LABELS) as (keyof Draft)[])
    .map((k) => [LABELS[k]!, draft[k]] as const)
    .filter(([, v]) => typeof v === "string" && v.trim());
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-foreground">Review</h2>
        <button onClick={onEdit} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
      <div className="flex gap-3">
        {media ? (
          <MediaPreview file={media} controls className="aspect-[9/16] w-40 shrink-0 rounded-2xl" />
        ) : (
          <div className="flex aspect-[9/16] w-40 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">Text only</div>
        )}
        <div className="min-w-0 space-y-2 text-sm">
          <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{CONTENT_LABELS[draft.contentType]}</span>
          {cover && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Thumbnail</p>
              <MediaPreview file={cover} controls={false} className="mt-1 h-20 w-14 rounded-lg object-cover" />
            </div>
          )}
          {["reel", "video_post", "announcement"].includes(draft.contentType) && (
            <p className="text-muted-foreground">Audience: <span className="text-foreground">{AUDIENCE[draft.audience]}</span></p>
          )}
          {["reel", "video_post"].includes(draft.contentType) && (
            <p className="text-muted-foreground">Comments: <span className="text-foreground">{draft.commentsEnabled ? "On" : "Off"}</span></p>
          )}
        </div>
      </div>
      <dl className="divide-y divide-border rounded-2xl border border-border bg-card/60">
        {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No details added.</p>}
        {rows.map(([label, v]) => (
          <div key={label} className="flex gap-3 p-3 text-sm">
            <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-foreground">{String(v).replace(/_/g, " ")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default ReviewStep;
