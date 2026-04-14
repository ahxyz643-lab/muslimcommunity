
-- Add image_url to messages for photo sharing
ALTER TABLE public.messages ADD COLUMN image_url text;

-- Add last_seen to profiles for online/offline status
ALTER TABLE public.profiles ADD COLUMN last_seen timestamp with time zone DEFAULT now();
