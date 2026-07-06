# Phase 5 — Stories, Reels UX, Settings Wiring & QA

Scope is large — grouping into 4 tracks. All backend changes go through one migration; frontend wired after approval.

## 1. Stories (24h, Telegram-backed)

- Make `StoriesBar` interactive:
  - "Your Story" tile opens a picker → upload image/video via `telegram-upload` edge function using **bot #2** (`TELEGRAM_BOT_TOKEN_2` / `TELEGRAM_CHANNEL_ID_2`) so it's isolated from posts/reels.
  - Insert row into `stories` (already exists) with `expires_at = now() + 24h`, `telegram_file_id`, `media_url`.
  - Tapping another user's ring opens a full-screen `StoryViewer` (tap → next, swipe down → close, auto-advance 5s, progress bars).
- Only show rings for users who have a non-expired story.
- Add cron-safe cleanup: `stories` older than 24h hidden by query filter (`expires_at > now()`); existing `cleanup_expired_stories()` function already handles deletion.
- New edge function param: `telegram-upload` accepts `?bot=2` to route to second bot. Falls back to bot #1 if not specified.

## 2. Profile ID image → Telegram

- When user updates avatar in `EditProfile`, also POST the new avatar to Telegram (bot #2, channel #2) with caption `Profile update: @username` — so admin channel gets a copy of every profile picture.
- Non-blocking: fire-and-forget, no UX delay if it fails.

## 3. Reels UX

- **Infinite scroll**: paginate `reels` in `Reels.tsx` (10 per page). IntersectionObserver on the last item → fetch next page and append. Loop back to start when exhausted so it *feels* infinite.
- **Back button**: floating top-left arrow (`ArrowLeft`) → `navigate(-1)`. Positioned over video with subtle gradient bg for contrast.
- **Hide bottom nav**: `BottomNav` currently rendered on all non-admin routes. Add `/reels` to the hide list in `App.tsx`.

## 4. Settings — wire everything

Currently stubs in `Settings.tsx`. Make functional:

- **Privacy & Security** → new page `/settings/privacy` with:
  - Private account toggle (writes `profiles.is_private` — add column)
  - Show activity status toggle (`profiles.show_activity`)
  - Blocked users list (reads from a new `blocks` table)
  - Change password (Supabase `updateUser({ password })`)
- **Notifications** → `/settings/notifications`:
  - Toggles for likes / comments / follows / messages / job updates (writes `profiles.notif_prefs jsonb`)
  - Server-side: `notify_*` triggers check `notif_prefs` before insert
- **Account Activity** → merge Activity page:
  - Tab 1: Notifications (current)
  - Tab 2: Watch History (reels the user watched — new `reel_views` table)
  - Tab 3: Login History (from `admin_logs` filtered to self, or new `auth_events`)
- **Help & Support** → `/settings/support`:
  - Form that inserts into existing `support_tickets` table
  - List user's past tickets with status
- Remove the "Admin Panel" and "Employer Dashboard" entries for non-admins/non-employers (role-gate visibility).

## 5. End-to-end QA sweep

- Verify all lazy routes load without console errors
- Check RLS: new tables (`blocks`, `reel_views`) get PERMISSIVE policies + GRANTs
- Fix any icon-only buttons missing `aria-label`
- Ensure hidden zero counts still enforced
- Test story upload flow with real image
- Test reels infinite scroll doesn't leak video elements

## Technical Details

**Migration** (single file):
- `ALTER TABLE profiles ADD is_private bool DEFAULT false, show_activity bool DEFAULT true, notif_prefs jsonb DEFAULT '{"likes":true,"comments":true,"follows":true,"messages":true,"jobs":true}'`
- `CREATE TABLE blocks (blocker_id, blocked_id, created_at)` + RLS + GRANTs
- `CREATE TABLE reel_views (user_id, reel_id, viewed_at)` + RLS + GRANTs
- Update `notify_*` functions to check `notif_prefs`

**Edge function edit**: `telegram-upload/index.ts` — add `bot` field in FormData, route to matching bot.

**New pages**: `PrivacySettings.tsx`, `NotificationSettings.tsx`, `HelpSupport.tsx`, `StoryViewer.tsx`, `StoryComposer.tsx`.

**Touched**: `App.tsx` (routes + BottomNav hide), `Settings.tsx` (real routes, role-gated items), `StoriesBar.tsx` (interactive), `EditProfile.tsx` (Telegram avatar copy), `Reels.tsx` (infinite + back + no nav), `Activity.tsx` (tabs).

## Out of scope

- Story replies / reactions
- Watch-history export
- Push notifications
- Story highlights (permanent stories on profile)

---

Approve to proceed. Given the size, I'll implement in this order: **migration → stories → reels UX → settings pages → QA sweep**, and after each track I'll pause briefly so you can spot-check.
