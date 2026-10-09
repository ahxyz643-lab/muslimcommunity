ALTER FUNCTION public.cleanup_expired_stories() SET search_path = '';
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN DELETE FROM public.stories WHERE expires_at < now(); END; $$;

DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by signed-in users" ON public.follows FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.likes;
CREATE POLICY "Users view own likes" ON public.likes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Reposts viewable by everyone" ON public.reposts;
CREATE POLICY "Users view own reposts" ON public.reposts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Reel likes viewable by everyone" ON public.reel_likes;
CREATE POLICY "Users view own reel likes" ON public.reel_likes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Reels viewable by everyone" ON public.reels;
CREATE POLICY "Visible reels viewable" ON public.reels FOR SELECT TO anon, authenticated USING (hidden = false OR auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Posts viewable by everyone" ON public.posts;
CREATE POLICY "Visible posts viewable" ON public.posts FOR SELECT TO anon, authenticated USING (hidden = false OR auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view stories" ON public.stories;
CREATE POLICY "Active stories viewable" ON public.stories FOR SELECT TO anon, authenticated USING (expires_at > now() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Non-banned profiles viewable" ON public.profiles FOR SELECT TO anon, authenticated USING (banned = false OR auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments on visible posts viewable" ON public.comments FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND (p.hidden = false OR p.user_id = auth.uid())) OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Reel comments viewable by everyone" ON public.reel_comments;
CREATE POLICY "Comments on visible reels viewable" ON public.reel_comments FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.reels r WHERE r.id = reel_id AND (r.hidden = false OR r.user_id = auth.uid())) OR public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Signed-in users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "settings_select" ON public.app_settings;
CREATE POLICY "settings_select_admin" ON public.app_settings FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Public read media" ON storage.objects;
DROP POLICY IF EXISTS "Reels media public" ON storage.objects;
CREATE POLICY "Owners and admins list media/reels" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('media','reels') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin_tier(auth.uid())));