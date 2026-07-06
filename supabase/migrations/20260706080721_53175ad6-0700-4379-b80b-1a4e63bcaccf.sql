
-- Profile privacy + notification prefs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_activity boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT '{"likes":true,"comments":true,"follows":true,"messages":true,"jobs":true}'::jsonb;

-- Blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.blocks
  FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- Reel watch history
CREATE TABLE IF NOT EXISTS public.reel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.reel_views TO authenticated;
GRANT ALL ON public.reel_views TO service_role;
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reel views" ON public.reel_views
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reel views" ON public.reel_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reel views" ON public.reel_views
  FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_user_time ON public.reel_views (user_id, viewed_at DESC);

-- Update notify triggers to respect notif_prefs
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text; prefs jsonb;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = owner_id;
  IF COALESCE((prefs->>'likes')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'like', actor_name || ' liked your post', NULL, jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text; prefs jsonb;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = owner_id;
  IF COALESCE((prefs->>'comments')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'comment', actor_name || ' commented on your post', LEFT(NEW.content, 120), jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text; prefs jsonb;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = owner_id;
  IF COALESCE((prefs->>'likes')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'like', actor_name || ' liked your reel', NULL, jsonb_build_object('reel_id', NEW.reel_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text; prefs jsonb;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = owner_id;
  IF COALESCE((prefs->>'comments')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'comment', actor_name || ' commented on your reel', LEFT(NEW.content, 120), jsonb_build_object('reel_id', NEW.reel_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text; prefs jsonb;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = NEW.following_id;
  IF COALESCE((prefs->>'follows')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (NEW.following_id, 'follow', actor_name || ' started following you', NULL, jsonb_build_object('actor_id', NEW.follower_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; actor_name text; prefs jsonb;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.sender_id;
  FOR recipient IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = recipient;
    IF COALESCE((prefs->>'messages')::boolean, true) = true THEN
      INSERT INTO public.notifications(user_id, type, title, body, data)
      VALUES (recipient, 'message', actor_name || ' sent you a message', LEFT(NEW.content, 120), jsonb_build_object('conversation_id', NEW.conversation_id, 'actor_id', NEW.sender_id));
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_job_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE employer uuid; job_title text; applicant_name text; prefs jsonb;
BEGIN
  SELECT poster_id, title INTO employer, job_title FROM public.jobs WHERE id = NEW.job_id;
  IF employer IS NULL OR employer = NEW.applicant_id THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = employer;
  IF COALESCE((prefs->>'jobs')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO applicant_name FROM public.profiles WHERE user_id = NEW.applicant_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (employer, 'job_application', applicant_name || ' applied to ' || COALESCE(job_title,'your job'),
          LEFT(COALESCE(NEW.cover_letter, NEW.message, ''), 120),
          jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id, 'actor_id', NEW.applicant_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_job_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job_title text; verb text; prefs jsonb;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;
  SELECT notif_prefs INTO prefs FROM public.profiles WHERE user_id = NEW.applicant_id;
  IF COALESCE((prefs->>'jobs')::boolean, true) = false THEN RETURN NEW; END IF;
  SELECT title INTO job_title FROM public.jobs WHERE id = NEW.job_id;
  verb := CASE NEW.status WHEN 'approved' THEN 'approved' ELSE 'declined' END;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (NEW.applicant_id, 'job_application_status',
          'Your application was ' || verb,
          COALESCE(job_title, 'A job you applied to') || ' — ' || verb,
          jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id, 'status', NEW.status));
  RETURN NEW;
END $$;
