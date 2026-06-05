
-- Notification triggers for interactions
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'like', actor_name || ' liked your post', NULL, jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'comment', actor_name || ' commented on your post', LEFT(NEW.content, 120), jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_reel_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'like', actor_name || ' liked your reel', NULL, jsonb_build_object('reel_id', NEW.reel_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_reel_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  SELECT user_id INTO owner_id FROM public.reels WHERE id = NEW.reel_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (owner_id, 'comment', actor_name || ' commented on your reel', LEFT(NEW.content, 120), jsonb_build_object('reel_id', NEW.reel_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.follower_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (NEW.following_id, 'follow', actor_name || ' started following you', NULL, jsonb_build_object('actor_id', NEW.follower_id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; actor_name text;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.sender_id;
  FOR recipient IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (recipient, 'message', actor_name || ' sent you a message', LEFT(NEW.content, 120), jsonb_build_object('conversation_id', NEW.conversation_id, 'actor_id', NEW.sender_id));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.likes;
CREATE TRIGGER trg_notify_post_like AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.comments;
CREATE TRIGGER trg_notify_post_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

DROP TRIGGER IF EXISTS trg_notify_reel_like ON public.reel_likes;
CREATE TRIGGER trg_notify_reel_like AFTER INSERT ON public.reel_likes FOR EACH ROW EXECUTE FUNCTION public.notify_reel_like();

DROP TRIGGER IF EXISTS trg_notify_reel_comment ON public.reel_comments;
CREATE TRIGGER trg_notify_reel_comment AFTER INSERT ON public.reel_comments FOR EACH ROW EXECUTE FUNCTION public.notify_reel_comment();

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_message();

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
