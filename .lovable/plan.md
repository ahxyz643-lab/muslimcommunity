# Phase 4 — Performance, Notifications, Admin polish, QA

Ship the last major pass: make the app fast, make notifications real, sharpen admin tooling, and lock down obvious QA gaps.

## 1. Performance

**Feed & Reels**
- Add DB indexes: `posts(purpose, created_at desc)`, `posts(user_id, created_at desc)`, `reels(created_at desc)`, `job_applications(job_id, status)`, `notifications(user_id, read, created_at desc)`.
- `PostCard`: memoize with `React.memo`, lazy-mount `CommentsSheet` / `HiringInlineCard` only when needed (already lazy for comments; make hiring card lazy via dynamic import).
- Home feed: paginate with `range()` (20 per page) + IntersectionObserver "load more" instead of one big fetch.
- Reels: keep only ±2 videos mounted, unload the rest (`<video>` `preload="none"` for offscreen); reuse existing IntersectionObserver.
- Images: add `loading="lazy"` + `decoding="async"` on avatars and post images sitewide.

**Bundle**
- Route-level `React.lazy` for `Admin`, `CreatorStudio`, `Employer`, `Donations`, `CreatePost`, `CreateReel`, `Reels` with `Suspense` fallback (spinner).
- Drop unused `date-fns` locales; keep default.

## 2. Notifications (real, not just DB rows)

- New `NotificationsBell` in `TopBar` showing unread count badge; subscribes via Realtime to `notifications where user_id=me`.
- Enable Realtime on `notifications`: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`.
- `Activity` page: mark-as-read on open (`update notifications set read=true where user_id=me and read=false`), tap-through routing:
  - `like` / `comment` on post → `/reels?start=<post_id>&kind=post` if video else scroll to post.
  - `reel` events → `/reels?start=<reel_id>`.
  - `follow` → `/user/<actor_id>`.
  - `message` → `/messages?c=<conversation_id>`.
  - `job_application` → `/employer`.
  - `job_application_status` → `/jobs`.
- Toast on incoming realtime notification while app is open.

## 3. Admin polish

- `AdminDashboard`: live counters (users, posts, reels, pending reports, pending job applications, open support tickets) with skeletons.
- `AdminReports`: quick actions — hide post, ban user (sets `profiles.banned=true`), mark resolved. Uses existing `guard_profile_sensitive` (admin-only).
- `AdminJobs`: list all jobs + applicants count, toggle `jobs.status`, delete.
- `AdminUsers`: search by username/email, verify/unverify, ban/unban, role assign (writes `user_roles`).
- All admin writes go through existing RLS + `has_role('admin')` — no new edge functions needed.

## 4. QA & polish

- Fix Reels: `views_count` update can race; switch to atomic `rpc('increment_reel_view', { _id })` (add small SECURITY DEFINER function).
- `ApplyDialog`: block duplicate apply (`select 1 from job_applications where job_id=? and applicant_id=?`) → toast "You already applied".
- `HiringInlineCard`: subscribe to `job_applications` inserts for that job so `applicants_count` updates live for the owner.
- Empty states: Jobs, Employer, Activity, Messages get proper illustrations + CTA.
- Error boundaries around `Home`, `Reels`, `Admin`.
- SEO: per-route `<title>` / `<meta description>` via a tiny `useSeo(title, desc)` hook applied on Home, Jobs, Reels, Profile, Auth.
- Accessibility: `aria-label` on all icon-only buttons in `PostCard`, `Reels`, `BottomNav`, `TopBar`.

## 5. Out of scope (later phase)

- Payments / paid job boosts.
- Push notifications (web-push) — only in-app + realtime for now.
- Video transcoding pipeline.
- Full i18n beyond current translation system.

## Technical notes

- One migration: indexes + realtime publication + `increment_reel_view` function.
- New files: `src/components/NotificationsBell.tsx`, `src/hooks/useSeo.ts`, `src/components/ErrorBoundary.tsx`.
- Touched: `App.tsx` (lazy routes + ErrorBoundary), `TopBar.tsx`, `Activity.tsx`, `Home.tsx`, `Reels.tsx`, `PostCard.tsx`, `HiringInlineCard.tsx`, `ApplyDialog.tsx`, admin pages listed above.
- No new secrets, no edge functions.

Approve to start implementation.
