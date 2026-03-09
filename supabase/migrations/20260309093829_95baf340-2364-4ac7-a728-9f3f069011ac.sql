
-- Add unique constraint on likes (one like per user per post)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_post_unique') THEN
    ALTER TABLE public.likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

-- Add unique constraint on reposts (one repost per user per post)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reposts_user_post_unique') THEN
    ALTER TABLE public.reposts ADD CONSTRAINT reposts_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

-- Add unique constraint on saves
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saves_user_post_unique') THEN
    ALTER TABLE public.saves ADD CONSTRAINT saves_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;
