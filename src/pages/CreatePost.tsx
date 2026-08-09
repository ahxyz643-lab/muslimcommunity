import { useState, useRef } from "react";
import { Image, Film, Type, X, Loader2, Play, Briefcase, HandHeart, Megaphone, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { uploadVideoToTelegram } from "@/lib/video";

type Purpose = "post" | "hiring" | "support_request" | "announcement";

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("post");
  const [hiring, setHiring] = useState({
    company: "", location: "", country: "", city: "",
    job_type: "full_time", salary_range: "", contact_link: "",
    remote: false, experience_level: "", education_level: "",
    skills: "", apply_deadline: "",
  });
  const [support, setSupport] = useState({ kind: "medical", amount: "", currency: "USD", contact: "" });
  const [selectedType, setSelectedType] = useState<"text" | "photo" | "video">("text");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = selectedType === "photo" ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: `Max ${selectedType === "photo" ? "10MB" : "20MB"}`, variant: "destructive" });
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setIsVideoPlaying(false);
  };

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setIsVideoPlaying(false);
  };

  const toggleVideoPreview = () => {
    if (!videoPreviewRef.current) return;
    if (isVideoPlaying) videoPreviewRef.current.pause();
    else videoPreviewRef.current.play();
    setIsVideoPlaying(!isVideoPlaying);
  };

  const handlePost = async () => {
    if (!user) return;
    if ((purpose === "hiring" || purpose === "support_request" || purpose === "announcement") && !title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (purpose === "post" && !content.trim() && !mediaFile) {
      toast({ title: "Add text or media to post", variant: "destructive" });
      return;
    }
    setPosting(true);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let telegramFileId: string | null = null;

      if (mediaFile) {
        if (selectedType === "photo") {
          const { uploadUserFile } = await import("@/lib/storage");
          imageUrl = await uploadUserFile("media", user.id, "photos", mediaFile);
        } else {
          telegramFileId = await uploadVideoToTelegram(mediaFile, content.trim() || undefined);
        }
      }

      const hashtags = Array.from(new Set((content.match(/#\w+/g) || []).map((h) => h.slice(1).toLowerCase()))).slice(0, 15);

      let jobId: string | null = null;
      let donationId: string | null = null;

      if (purpose === "hiring") {
        const skillsArr = hiring.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
        const { data: jobRow, error: jobErr } = await supabase.from("jobs").insert({
          poster_id: user.id,
          title: title.trim(),
          company: hiring.company.trim() || null,
          location: hiring.location.trim() || null,
          description: content.trim() || title.trim(),
          job_type: hiring.job_type,
          salary_range: hiring.salary_range.trim() || null,
          contact_link: hiring.contact_link.trim() || null,
          country: hiring.country.trim() || null,
          city: hiring.city.trim() || null,
          experience_level: hiring.experience_level.trim() || null,
          education_level: hiring.education_level.trim() || null,
          skills: skillsArr,
          apply_deadline: hiring.apply_deadline ? new Date(hiring.apply_deadline).toISOString() : null,
          remote: hiring.remote,
          status: "approved",
        } as any).select("id").single();
        if (jobErr) throw jobErr;
        jobId = jobRow.id;
      }

      if (purpose === "support_request") {
        const { data: donRow, error: donErr } = await supabase.from("donations").insert({
          user_id: user.id,
          kind: support.kind,
          title: title.trim(),
          description: content.trim() || null,
          amount: support.amount ? Number(support.amount) : null,
          currency: support.currency,
          contact: support.contact.trim() || null,
          status: "pending",
        } as any).select("id").single();
        if (donErr) throw donErr;
        donationId = donRow.id;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim() || title.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
        telegram_file_id: telegramFileId,
        purpose,
        title: purpose !== "post" ? title.trim() : null,
        hashtags,
        job_id: jobId,
        donation_id: donationId,
      } as any);
      if (error) throw error;

      toast({ title: "Published ✨" });
      navigate("/");
    } catch (err: any) {
      console.error("[CreatePost]", err);
      toast({ title: "Error", description: (await import("@/lib/errors")).getUserFriendlyError(err), variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const mediaTypes = [
    { type: "text" as const, icon: Type, label: "Text" },
    { type: "photo" as const, icon: Image, label: "Photo" },
    { type: "video" as const, icon: Film, label: "Video" },
  ];

  const purposeOptions: { value: Purpose; icon: typeof FileText; label: string }[] = [
    { value: "post", icon: FileText, label: "Post" },
    { value: "hiring", icon: Briefcase, label: "Hiring" },
    { value: "support_request", icon: HandHeart, label: "Support" },
    { value: "announcement", icon: Megaphone, label: "Announce" },
  ];

  const inputCls = "w-full rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="min-h-screen pb-24">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <X className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Create</h1>
        <button
          onClick={handlePost}
          disabled={posting}
          className="rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 hover:shadow-glow"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1">
        {purposeOptions.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setPurpose(value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              purpose === value
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-4 py-3">
        {mediaTypes.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => { setSelectedType(type); removeMedia(); }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedType === type ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {purpose !== "post" && (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              purpose === "hiring" ? "Job title (e.g. Senior React Developer)"
              : purpose === "support_request" ? "What do you need help with?"
              : "Headline"
            }
            className="mb-3 w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 font-serif text-lg text-foreground outline-none focus:border-primary"
          />
        )}

        <div className="flex gap-3">
          <img
            src={profile?.avatar_url || "https://i.pravatar.cc/150"}
            alt="You"
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-primary/30"
          />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                purpose === "hiring" ? "Describe the role, responsibilities, and what you're looking for…"
                : purpose === "support_request" ? "Share your story so the community can help…"
                : purpose === "announcement" ? "What do you want to announce?"
                : "What's on your mind?"
              }
              className="min-h-[140px] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {purpose === "hiring" && (
          <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card/60 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#c9a84c]">Job details</p>
            <input placeholder="Company" value={hiring.company} onChange={(e) => setHiring({ ...hiring, company: e.target.value })} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Country" value={hiring.country} onChange={(e) => setHiring({ ...hiring, country: e.target.value })} className={inputCls} />
              <input placeholder="City" value={hiring.city} onChange={(e) => setHiring({ ...hiring, city: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={hiring.job_type} onChange={(e) => setHiring({ ...hiring, job_type: e.target.value })} className={inputCls}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
              <input placeholder="Salary range" value={hiring.salary_range} onChange={(e) => setHiring({ ...hiring, salary_range: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Experience level" value={hiring.experience_level} onChange={(e) => setHiring({ ...hiring, experience_level: e.target.value })} className={inputCls} />
              <input placeholder="Education level" value={hiring.education_level} onChange={(e) => setHiring({ ...hiring, education_level: e.target.value })} className={inputCls} />
            </div>
            <input placeholder="Skills (comma separated)" value={hiring.skills} onChange={(e) => setHiring({ ...hiring, skills: e.target.value })} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={hiring.apply_deadline} onChange={(e) => setHiring({ ...hiring, apply_deadline: e.target.value })} className={inputCls} />
              <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm">
                <input type="checkbox" checked={hiring.remote} onChange={(e) => setHiring({ ...hiring, remote: e.target.checked })} />
                Remote allowed
              </label>
            </div>
            <input placeholder="Contact link / email (optional)" value={hiring.contact_link} onChange={(e) => setHiring({ ...hiring, contact_link: e.target.value })} className={inputCls} />
          </div>
        )}

        {purpose === "support_request" && (
          <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card/60 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">Support details</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={support.kind} onChange={(e) => setSupport({ ...support, kind: e.target.value })} className={inputCls}>
                <option value="medical">Medical</option>
                <option value="education">Education</option>
                <option value="food">Food</option>
                <option value="zakat">Zakat</option>
                <option value="sadaqah">Sadaqah</option>
                <option value="emergency">Emergency</option>
              </select>
              <select value={support.currency} onChange={(e) => setSupport({ ...support, currency: e.target.value })} className={inputCls}>
                <option value="USD">USD</option><option value="EUR">EUR</option>
                <option value="GBP">GBP</option><option value="AED">AED</option>
                <option value="SAR">SAR</option><option value="INR">INR</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
            <input type="number" placeholder="Amount needed" value={support.amount} onChange={(e) => setSupport({ ...support, amount: e.target.value })} className={inputCls} />
            <input placeholder="Contact (WhatsApp/email)" value={support.contact} onChange={(e) => setSupport({ ...support, contact: e.target.value })} className={inputCls} />
          </div>
        )}

        {mediaPreview && selectedType === "photo" && (
          <div className="relative mt-4">
            <img src={mediaPreview} alt="Preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} />
            <button onClick={removeMedia} className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {mediaPreview && selectedType === "video" && (
          <div className="relative mt-4">
            <video ref={videoPreviewRef} src={mediaPreview} className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} onEnded={() => setIsVideoPlaying(false)} playsInline />
            {!isVideoPlaying && (
              <button onClick={toggleVideoPreview} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-glow">
                <Play className="h-6 w-6 ml-0.5" />
              </button>
            )}
            <button onClick={removeMedia} className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {selectedType !== "text" && !mediaPreview && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border py-14 transition-colors hover:border-primary/50"
          >
            <div className="text-center">
              {selectedType === "photo" ? <Image className="mx-auto mb-2 h-10 w-10 text-muted-foreground" /> : <Film className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />}
              <p className="text-sm text-muted-foreground">Tap to upload {selectedType}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {selectedType === "photo" ? "JPG, PNG up to 10MB" : "MP4, MOV up to 20MB"}
              </p>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept={selectedType === "photo" ? "image/*" : "video/*"} onChange={handleMediaSelect} className="hidden" />
      </div>
    </div>
  );
};

export default CreatePost;