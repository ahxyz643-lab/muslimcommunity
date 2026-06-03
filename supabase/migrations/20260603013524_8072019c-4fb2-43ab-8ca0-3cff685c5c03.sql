-- Make reels.video_url nullable so we can clear legacy Supabase storage references
ALTER TABLE public.reels ALTER COLUMN video_url DROP NOT NULL;

-- Clear all video_url references; only telegram_file_id videos will play from now on
UPDATE public.posts SET video_url = NULL WHERE video_url IS NOT NULL;
UPDATE public.reels SET video_url = NULL WHERE video_url IS NOT NULL;