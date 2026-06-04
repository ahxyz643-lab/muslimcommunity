
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  _user_id uuid,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0,
  _videos_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  kind text,
  user_id uuid,
  content text,
  image_url text,
  video_url text,
  telegram_file_id text,
  likes_count int,
  comments_count int,
  reposts_count int,
  saves_count int,
  created_at timestamptz,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH taste_authors AS (
    SELECT DISTINCT p.user_id
    FROM public.likes l
    JOIN public.posts p ON p.id = l.post_id
    WHERE l.user_id = _user_id AND l.created_at > now() - interval '30 days'
    UNION
    SELECT DISTINCT p.user_id
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.user_id = _user_id AND c.created_at > now() - interval '30 days'
    UNION
    SELECT DISTINCT r.user_id
    FROM public.reel_likes rl
    JOIN public.reels r ON r.id = rl.reel_id
    WHERE rl.user_id = _user_id AND rl.created_at > now() - interval '30 days'
    UNION
    SELECT DISTINCT r.user_id
    FROM public.reel_comments rc
    JOIN public.reels r ON r.id = rc.reel_id
    WHERE rc.user_id = _user_id AND rc.created_at > now() - interval '30 days'
  ),
  follow_authors AS (
    SELECT following_id AS user_id FROM public.follows WHERE follower_id = _user_id
  ),
  combined AS (
    SELECT
      p.id, 'post'::text AS kind, p.user_id, p.content,
      p.image_url, p.video_url, p.telegram_file_id,
      p.likes_count, p.comments_count, p.reposts_count, p.saves_count,
      p.created_at
    FROM public.posts p
    WHERE p.hidden = false
      AND (NOT _videos_only OR p.video_url IS NOT NULL OR p.telegram_file_id IS NOT NULL)
    UNION ALL
    SELECT
      r.id, 'reel'::text AS kind, r.user_id, COALESCE(r.caption, ''),
      r.thumbnail_url, r.video_url, r.telegram_file_id,
      r.likes_count, r.comments_count, 0, 0,
      r.created_at
    FROM public.reels r
    WHERE r.hidden = false
  )
  SELECT
    c.id, c.kind, c.user_id, c.content, c.image_url, c.video_url, c.telegram_file_id,
    c.likes_count, c.comments_count, c.reposts_count, c.saves_count, c.created_at,
    (
      CASE WHEN c.user_id IN (SELECT user_id FROM taste_authors) THEN 4.0 ELSE 0 END
      + CASE WHEN c.user_id IN (SELECT user_id FROM follow_authors) THEN 3.0 ELSE 0 END
      + 2.0 * ln(c.likes_count + 1)
      + 3.0 * ln(c.comments_count + 1)
      + 5.0 * exp(- EXTRACT(EPOCH FROM (now() - c.created_at)) / 86400.0 / 7.0)
    ) AS score
  FROM combined c
  ORDER BY score DESC, c.created_at DESC
  LIMIT _limit OFFSET _offset
$$;

GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, int, int, boolean) TO authenticated, anon;
