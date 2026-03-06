import { useState, useRef } from "react";
import { Image, Film, Type, X, Loader2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
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

    // Validate size
    const maxSize = selectedType === "photo" ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: `Max ${selectedType === "photo" ? "10MB" : "100MB"}`, variant: "destructive" });
      return;
    }

    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
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
    if (isVideoPlaying) {
      videoPreviewRef.current.pause();
    } else {
      videoPreviewRef.current.play();
    }
    setIsVideoPlaying(!isVideoPlaying);
  };

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("media").upload(path, mediaFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        if (selectedType === "photo") {
          imageUrl = urlData.publicUrl;
        } else {
          videoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
      });

      if (error) throw error;

      toast({ title: "Post shared! ✨" });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const mediaTypes = [
    { type: "text" as const, icon: Type, label: "Text" },
    { type: "photo" as const, icon: Image, label: "Photo" },
    { type: "video" as const, icon: Film, label: "Video" },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <X className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Create Post</h1>
        <button
          onClick={handlePost}
          disabled={!content.trim() || posting}
          className="rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 hover:shadow-glow"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </button>
      </div>

      {/* Media Type Selector */}
      <div className="flex gap-2 px-4 py-3">
        {mediaTypes.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => {
              setSelectedType(type);
              removeMedia();
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedType === type
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="px-4">
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
              placeholder="What's on your mind?"
              className="min-h-[150px] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Media Preview */}
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
            <video
              ref={videoPreviewRef}
              src={mediaPreview}
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 300 }}
              onEnded={() => setIsVideoPlaying(false)}
              playsInline
            />
            {!isVideoPlaying && (
              <button
                onClick={toggleVideoPreview}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-glow"
              >
                <Play className="h-6 w-6 ml-0.5" />
              </button>
            )}
            {isVideoPlaying && (
              <button
                onClick={toggleVideoPreview}
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/20 opacity-0 transition-opacity hover:opacity-100"
              >
                <span className="rounded-full bg-background/60 px-4 py-2 text-sm font-medium text-foreground">Pause</span>
              </button>
            )}
            <button onClick={removeMedia} className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Upload area */}
        {selectedType !== "text" && !mediaPreview && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border py-16 transition-colors hover:border-primary/50"
          >
            <div className="text-center">
              {selectedType === "photo" ? (
                <Image className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              ) : (
                <Film className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">Tap to upload {selectedType}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {selectedType === "photo" ? "JPG, PNG up to 10MB" : "MP4, MOV up to 100MB"}
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={selectedType === "photo" ? "image/*" : "video/*"}
          onChange={handleMediaSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default CreatePost;
