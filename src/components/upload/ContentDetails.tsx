import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import type { Draft } from "@/lib/upload/UploadManager";
import MediaPreview from "./MediaPreview";

type Props = {
  draft: Draft;
  setDraft: (d: Draft) => void;
  cover: File | null;
  setCover: (f: File | null) => void;
  media: File | null;
};

const inputCls = "w-full rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block space-y-1">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    {children}
  </label>
);

const ContentDetails = ({ draft, setDraft, cover, setCover, media }: Props) => {
  const coverRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const t = draft.contentType;

  const text = (key: keyof Draft, label: string, placeholder = "", type = "text") => (
    <Field label={label}>
      <input type={type} value={(draft[key] as string) || ""} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value } as any)} className={inputCls} />
    </Field>
  );
  const area = (label: string, placeholder: string) => (
    <Field label={label}>
      <textarea value={draft.caption} placeholder={placeholder} onChange={(e) => set({ caption: e.target.value })} rows={4} className={`${inputCls} resize-none`} />
    </Field>
  );
  const coverField = (label: string) => (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {cover ? (
          <div className="relative h-20 w-16 overflow-hidden rounded-lg">
            <MediaPreview file={cover} controls={false} className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove cover" onClick={() => setCover(null)} className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
          </div>
        ) : null}
        <button type="button" onClick={() => coverRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary">
          <ImagePlus className="h-4 w-4" /> {cover ? "Change image" : "Choose image (optional)"}
        </button>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCover(f); e.target.value = ""; }} />
      </div>
    </Field>
  );
  const audience = (
    <Field label="Audience">
      <select value={draft.audience} onChange={(e) => set({ audience: e.target.value as Draft["audience"] })} className={inputCls}>
        <option value="public">Everyone</option>
        <option value="followers">Followers</option>
        <option value="private">Only me</option>
      </select>
    </Field>
  );
  const comments = (
    <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground">
      Allow comments
      <input type="checkbox" checked={draft.commentsEnabled} onChange={(e) => set({ commentsEnabled: e.target.checked })} className="h-4 w-4 accent-primary" />
    </label>
  );
  const social = (
    <>
      {text("hashtags", "Hashtags", "#ramadan #community")}
      {text("mentions", "Mentions", "@username, @friend")}
    </>
  );
  const mediaNote = (
    <Field label="Media">
      <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground">{media ? media.name : "No media attached — go back to the camera to add one."}</p>
    </Field>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl text-foreground">Add details</h2>

      {t === "reel" && (<>{area("Caption", "Write a caption…")}{social}{coverField("Cover")}{audience}{comments}</>)}

      {t === "video_post" && (<>{text("title", "Title", "Give it a title")}{area("Description", "What is this about?")}{coverField("Thumbnail")}{social}{audience}{comments}</>)}

      {t === "sports" && (
        <>
          {text("sport", "Sport", "Cricket, football…")}
          {text("event", "Match / event", "Community Cup final")}
          {text("teams", "Teams", "Team A vs Team B")}
          <div className="grid grid-cols-2 gap-3">{text("datetime", "Date & time", "", "datetime-local")}{text("venue", "Venue", "Stadium / ground")}</div>
          {text("result", "Result / status", "Won 3–1 · Upcoming · Live")}
          {area("Description", "Highlights, notes…")}
          {coverField("Thumbnail")}
        </>
      )}

      {t === "job" && (
        <>
          {text("title", "Job title", "Senior React Developer")}
          {text("company", "Company")}
          {area("Description", "Role, responsibilities, requirements…")}
          {text("location", "Location", "City, country")}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Work mode">
              <select value={draft.workMode || "on_site"} onChange={(e) => set({ workMode: e.target.value as Draft["workMode"] })} className={inputCls}>
                <option value="on_site">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option>
              </select>
            </Field>
            <Field label="Employment type">
              <select value={draft.jobType || "full_time"} onChange={(e) => set({ jobType: e.target.value })} className={inputCls}>
                <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option>
              </select>
            </Field>
          </div>
          {text("salary", "Salary", "e.g. 50k–70k USD")}
          {text("skills", "Skills", "React, TypeScript (comma separated)")}
          {text("applyMethod", "How to apply", "Email or link (leave empty to apply in-app)")}
          {text("deadline", "Deadline", "", "date")}
        </>
      )}

      {t === "announcement" && (<>{text("title", "Title", "Headline")}{area("Description", "What do you want to announce?")}{mediaNote}{audience}</>)}

      {t === "support" && (
        <>
          <Field label="Category">
            <select value={draft.category || "medical"} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
              {["medical", "education", "food", "zakat", "sadaqah", "emergency"].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </Field>
          {text("title", "Title", "What do you need help with?")}
          {area("Description", "Share your story so the community can help…")}
          {mediaNote}
          <div className="grid grid-cols-2 gap-3">
            {text("amount", "Amount needed", "0", "number")}
            <Field label="Currency">
              <select value={draft.currency || "USD"} onChange={(e) => set({ currency: e.target.value })} className={inputCls}>
                {["USD", "EUR", "GBP", "AED", "SAR", "INR", "PKR"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          {text("contact", "Contact / application details", "WhatsApp, email…")}
        </>
      )}
    </div>
  );
};

export default ContentDetails;
