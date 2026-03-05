import { useState } from "react";
import { Image, Film, Type, X, MapPin, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "@/data/mockData";

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<"text" | "photo" | "video">("text");

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
          disabled={!content.trim()}
          className="rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 hover:shadow-glow"
        >
          Post
        </button>
      </div>

      {/* Media Type */}
      <div className="flex gap-2 px-4 py-3">
        {mediaTypes.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
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
            src={currentUser.avatar}
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

        {/* Upload area for photo/video */}
        {selectedType !== "text" && (
          <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
            <div className="text-center">
              {selectedType === "photo" ? (
                <Image className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              ) : (
                <Film className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                Tap to upload {selectedType}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {selectedType === "photo" ? "JPG, PNG up to 10MB" : "MP4, MOV up to 100MB"}
              </p>
            </div>
          </div>
        )}

        {/* Quick options */}
        <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
            <MapPin className="h-4 w-4" />
            <span className="text-xs">Location</span>
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
            <Hash className="h-4 w-4" />
            <span className="text-xs">Hashtag</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
