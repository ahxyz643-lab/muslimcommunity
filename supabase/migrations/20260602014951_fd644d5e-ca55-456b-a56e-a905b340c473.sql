ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;