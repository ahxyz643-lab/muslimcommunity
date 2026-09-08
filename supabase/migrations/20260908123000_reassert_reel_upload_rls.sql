-- Keep reel uploads authenticated and owner-scoped.
-- This is idempotent so it is safe to run against an existing production database.
DO $$
BEGIN
  IF to_regclass('public.reels') IS NOT NULL THEN
    ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can create own reels" ON public.reels;
    CREATE POLICY "Users can create own reels"
      ON public.reels
      FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);

    DROP POLICY IF EXISTS "Users can update own reels" ON public.reels;
    CREATE POLICY "Users can update own reels"
      ON public.reels
      FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);

    DROP POLICY IF EXISTS "Users can delete own reels" ON public.reels;
    CREATE POLICY "Users can delete own reels"
      ON public.reels
      FOR DELETE
      TO authenticated
      USING ((select auth.uid()) = user_id);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels TO authenticated;
  END IF;
END
$$;
