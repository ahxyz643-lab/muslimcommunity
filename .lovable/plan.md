## What to build

### 1. Unified feed + Reels player launch
- `PostCard.tsx`: when post has video (telegram_file_id/video_url), wrap video area in tap handler → navigate to `/reels?start=<postId>&type=post`.
- `src/pages/Reels.tsx`: load BOTH `posts` (with video) and `reels` into one merged vertical list, sorted by personalized score. Accept `?start=<id>` query param to scroll to that item on mount.
- Reels page renders both kinds: reel rows use reel_likes/reel_comments tables, post rows use likes/comments tables. Single `MediaPlayer` component handles either.

### 2. Personalized algorithm (per-user)
- New SQL view + RPC `get_personalized_feed(_user_id, _limit, _offset)`:
  - Compute user's "taste" = authors of posts/reels user liked or commented on in last 30 days (top 50).
  - Score each candidate = `4*has_taste_author + 2*log(likes+1) + 3*log(comments+1) + recency_decay(created_at)`.
  - Return unioned post+reel rows ordered by score DESC.
- Home page calls `supabase.rpc('get_personalized_feed', ...)` instead of plain `from('posts')`.
- Reels page same RPC but filtered to video-only.

### 3. Jobs + Donations user UI (everywhere)
- **Bottom nav** (`BottomNav.tsx`): add Briefcase (Jobs) and HandHeart (Donate) icons → 7 tabs total OR replace least-used. Keep at 5 by moving Create into a FAB; nav becomes Home/Explore/Jobs/Donate/Profile, Messages as TopBar icon.
- **New pages** `src/pages/Jobs.tsx` and `src/pages/Donations.tsx`: list approved entries from `jobs`/`donations` tables; "+ Post" CTA opens compose sheet writing with `status='pending'`.
- **Explore page**: add Jobs/Donations tabs alongside existing tabs.
- **Home feed inject**: every 10 posts inject a `JobCard` or `DonationCard` (alternating) showing top approved entry.

### 4. Routes
Add `/jobs`, `/donations` to `App.tsx`.

## Technical details

- **Algorithm SQL**: single SECURITY DEFINER function returning `(id uuid, kind text, user_id uuid, content text, media_url text, telegram_file_id text, likes_count int, comments_count int, created_at timestamptz, score float)`. `kind` = 'post' or 'reel'.
- **Recency decay**: `extract(epoch from (now()-created_at))/86400` → `exp(-days/7)`.
- **Reels list type**: existing Reels component uses one schema; refactor to a `MediaItem` union and branch on `kind` for like/comment table names.
- **Nav layout**: 5 tabs with center floating "+" button; Messages icon moves to TopBar right side next to notifications. Cleaner Instagram-like.
- **Feed inject cards**: small components `<JobInlineCard/>` `<DonationInlineCard/>` pulling latest 1 approved row, with "View all" → /jobs.

## Out of scope
- No changes to upload pipeline or Telegram bots.
- No admin panel changes (jobs/donations admin already exists).
- No content embeddings; algorithm is interaction-graph based, not AI-vector.
