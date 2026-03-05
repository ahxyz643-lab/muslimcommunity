import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Bookmark, Share2, MoreHorizontal, Languages } from "lucide-react";
import type { Post } from "@/data/mockData";

const PostCard = ({ post }: { post: Post }) => {
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(post.saved);
  const [reposted, setReposted] = useState(post.reposted);
  const [likes, setLikes] = useState(post.likes);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <article className="border-b border-border animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={post.user.avatar}
            alt={post.user.displayName}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">
                {post.user.displayName}
              </span>
              {post.user.verified && (
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              @{post.user.username} · {post.timestamp}
            </span>
          </div>
        </div>
        <button className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {post.content}
        </p>
        {post.language && post.language !== "en" && (
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Languages className="h-3.5 w-3.5" />
            {showTranslation ? "Show original" : "Translate post"}
          </button>
        )}
        {showTranslation && (
          <p className="mt-2 rounded-lg bg-secondary/50 p-3 text-sm italic text-muted-foreground">
            [Translation will appear here when backend is connected]
          </p>
        )}
      </div>

      {/* Image */}
      {post.image && (
        <div className="px-4 pb-3">
          <img
            src={post.image}
            alt="Post content"
            className="w-full rounded-xl object-cover"
            style={{ maxHeight: 400 }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="group flex items-center gap-1.5">
            <Heart
              className={`h-5 w-5 transition-all duration-200 ${
                liked ? "fill-destructive text-destructive scale-110" : "text-muted-foreground group-hover:text-destructive"
              }`}
            />
            <span className={`text-xs ${liked ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {formatCount(likes)}
            </span>
          </button>
          <button className="group flex items-center gap-1.5">
            <MessageCircle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-xs text-muted-foreground">{formatCount(post.comments)}</span>
          </button>
          <button
            onClick={() => setReposted(!reposted)}
            className="group flex items-center gap-1.5"
          >
            <Repeat2
              className={`h-5 w-5 transition-colors ${
                reposted ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              }`}
            />
            <span className={`text-xs ${reposted ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {formatCount(post.reposts)}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSaved(!saved)}>
            <Bookmark
              className={`h-5 w-5 transition-all duration-200 ${
                saved ? "fill-accent text-accent" : "text-muted-foreground hover:text-accent"
              }`}
            />
          </button>
          <button>
            <Share2 className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
