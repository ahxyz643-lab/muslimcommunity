-- Reels table
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  music_name TEXT,
  filter TEXT,
  text_overlay TEXT,
  duration_seconds INTEGER DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reels viewable by everyone" ON public.reels FOR SELECT USING (true);
CREATE POLICY "Users can create own reels" ON public.reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reels" ON public.reels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reels" ON public.reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_reels_updated_at BEFORE UPDATE ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reel likes
CREATE TABLE public.reel_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reel likes viewable by everyone" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Users can like reels" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON public.reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reel comments
CREATE TABLE public.reel_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reel comments viewable by everyone" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Users can create reel comments" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reel comments" ON public.reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Reels media public" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "Users can upload reels" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own reels media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_reels_created ON public.reels(created_at DESC);
CREATE INDEX idx_reels_user ON public.reels(user_id);
CREATE INDEX idx_reel_likes_reel ON public.reel_likes(reel_id);
CREATE INDEX idx_reel_comments_reel ON public.reel_comments(reel_id);