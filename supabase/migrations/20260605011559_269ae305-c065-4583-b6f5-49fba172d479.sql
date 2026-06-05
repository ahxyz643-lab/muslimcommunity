
-- 1. Donations: prevent self-approval / self-verify / self-unflag
CREATE OR REPLACE FUNCTION public.guard_donations_sensitive()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verified IS DISTINCT FROM OLD.verified
      OR NEW.flagged IS DISTINCT FROM OLD.flagged)
     AND NOT public.is_admin_tier(auth.uid())
     AND COALESCE(auth.jwt() ->> 'role','') <> 'service_role'
  THEN
    RAISE EXCEPTION 'Only admins can change status, verified, or flagged on donations';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_donations_sensitive ON public.donations;
CREATE TRIGGER trg_guard_donations_sensitive
BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.guard_donations_sensitive();

-- 2. Profiles: prevent self-grant verified / self-unban
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.verified IS DISTINCT FROM OLD.verified
      OR NEW.banned IS DISTINCT FROM OLD.banned)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND COALESCE(auth.jwt() ->> 'role','') <> 'service_role'
  THEN
    RAISE EXCEPTION 'Only admins can change verified or banned on profiles';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_profile_sensitive ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive();

-- 3. Messages: restrict edits to sender (keep separate read-receipt path via trigger-style; we keep simple here)
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 4. conversation_participants: must be self, and either creating (no other participants yet) or already a participant
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- 5. Notifications: drop permissive public INSERT. Triggers are SECURITY DEFINER so they bypass RLS.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()));

-- 6. Storage: drop redundant broad policies on media bucket
DROP POLICY IF EXISTS "Auth users upload media" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update media" ON storage.objects;
DROP POLICY IF EXISTS "Media publicly accessible" ON storage.objects;
-- keep "Public read media", "Users can update own media", "Authenticated users can upload media", "Users can delete own media"
