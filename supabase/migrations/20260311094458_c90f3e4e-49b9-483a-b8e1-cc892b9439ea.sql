
-- Storage policies for media bucket (profile photos)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users upload media' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Auth users upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read media' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users update media' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Auth users update media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media');
  END IF;
END $$;
