CREATE TABLE IF NOT EXISTS public.reel_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reel_id)
);
GRANT SELECT, INSERT, DELETE ON public.reel_saves TO authenticated;
GRANT ALL ON public.reel_saves TO service_role;
ALTER TABLE public.reel_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reel_saves_own" ON public.reel_saves;
CREATE POLICY "reel_saves_own" ON public.reel_saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reel_saves_user ON public.reel_saves(user_id);