-- Fix RLS policies: drop RESTRICTIVE ones and recreate as PERMISSIVE

-- Profiles
DROP POLICY "Profiles viewable by everyone" ON public.profiles;
DROP POLICY "Users can insert own profile" ON public.profiles;
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Posts
DROP POLICY "Posts viewable by everyone" ON public.posts;
DROP POLICY "Users can create own posts" ON public.posts;
DROP POLICY "Users can update own posts" ON public.posts;
DROP POLICY "Users can delete own posts" ON public.posts;

CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Likes
DROP POLICY "Likes viewable by everyone" ON public.likes;
DROP POLICY "Users can like" ON public.likes;
DROP POLICY "Users can unlike" ON public.likes;

CREATE POLICY "Likes viewable by everyone" ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saves
DROP POLICY "Saves viewable by owner" ON public.saves;
DROP POLICY "Users can save" ON public.saves;
DROP POLICY "Users can unsave" ON public.saves;

CREATE POLICY "Saves viewable by owner" ON public.saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save" ON public.saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave" ON public.saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add video_url column to posts
ALTER TABLE public.posts ADD COLUMN video_url TEXT;

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- Storage policies
CREATE POLICY "Media publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);