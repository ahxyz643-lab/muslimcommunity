import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play, Heart, MessageCircle, Eye, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useSeo } from "@/hooks/useSeo";

type TikTokVideo = {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  share_url?: string;
  duration?: number;
  create_time?: number;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
};

type TikTokProfile = {
  display_name?: string;
  avatar_url?: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  video_count?: number;
};

const compact = (n?: number) => (typeof n === "number" ? Intl.NumberFormat("en", { notation: "compact" }).format(n) : "0");

const TikTokFeed = () => {
  const navigate = useNavigate();
  useSeo({
    title: "TikTok Videos | Muslim Community",
    description: "Watch the latest TikTok videos from the Muslim Community account, all in one place.",
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["tiktok-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tiktok-videos", { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { profile: TikTokProfile | null; videos: TikTokVideo[] };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const profile = data?.profile;
  const videos = data?.videos ?? [];

  return (
    <div className="min-h-screen pb-24 pt-4">
      <div className="flex items-center gap-3 px-4 pb-4">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="rounded-full bg-secondary p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">TikTok</h1>
        <button
          onClick={() => refetch()}
          aria-label="Refresh TikTok videos"
          className="ml-auto rounded-full bg-secondary p-2 text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {profile && (
        <div className="mx-4 mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={`${profile.display_name || "TikTok"} profile photo`} loading="lazy" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-secondary" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-sm font-semibold text-foreground">{profile.display_name || "TikTok"}</p>
              {profile.is_verified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground">
              {compact(profile.follower_count)} followers · {compact(profile.video_count)} videos
            </p>
          </div>
          {profile.profile_deep_link && (
            <a
              href={profile.profile_deep_link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Open
            </a>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="mx-4 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-foreground">We couldn't load the TikTok videos right now.</p>
          <button onClick={() => refetch()} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && videos.length === 0 && (
        <p className="px-6 py-16 text-center text-sm text-muted-foreground">
          No videos on the connected TikTok account yet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3">
        {videos.map((v) => (
          <a
            key={v.id}
            href={v.share_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-[9/16] overflow-hidden rounded-xl bg-secondary"
          >
            {v.cover_image_url ? (
              <img
                src={v.cover_image_url}
                alt={v.title || v.video_description || "TikTok video"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Play className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              {(v.title || v.video_description) && (
                <p className="line-clamp-2 text-[11px] font-medium text-white">{v.title || v.video_description}</p>
              )}
              <div className="mt-1 flex items-center gap-2 text-[10px] text-white/80">
                <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{compact(v.view_count)}</span>
                <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{compact(v.like_count)}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{compact(v.comment_count)}</span>
                <ExternalLink className="ml-auto h-3 w-3" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default TikTokFeed;
