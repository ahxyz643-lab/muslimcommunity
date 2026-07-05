
-- Indexes for perf
CREATE INDEX IF NOT EXISTS idx_posts_purpose_created ON public.posts(purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_created ON public.reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_apps_job_status ON public.job_applications(job_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.job_applications REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Atomic reel view increment
CREATE OR REPLACE FUNCTION public.increment_reel_view(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.reels SET views_count = COALESCE(views_count,0) + 1 WHERE id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_reel_view(uuid) TO anon, authenticated;
