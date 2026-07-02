
This is a very large scope (20+ areas). Doing everything in one shot would burn credits and destabilize working features. I'll deliver it in **4 approvable phases**. Each phase is independently useful and testable. Please approve Phase 1 to start — later phases run after you review results.

---

## Phase 1 — Critical fixes + Guest Mode (ship first)

**Auth**
- Google/Apple sign-in: switch to `lovable.auth.signInWithOAuth` with `redirect_uri = window.location.origin`; remove any localhost hardcoding; store intended path separately and navigate after session hydrates.
- Add public `/auth/callback` route for post-OAuth session pickup.

**Guest Mode**
- All read routes (Home, Reels, Explore, Profile, Search) open without login.
- New `<RequireAuth>` gate wraps like/comment/follow/message/upload; triggers a Login Modal instead of hard redirect.

**Reels fixes**
- Comment input already always renders (last turn). Verify Reply on reels (disabled — reel_comments has no `parent_id`, keep post-only).
- Add Follow button on every Reel and Post card.

**Calling debug**
- Log signaling states; ensure ringtone + incoming screen show on callee via realtime `call_logs` insert; safe-area padding on controls.

**Chat audit**
- Verify realtime subscription cleanup; fix read receipts; online status via `presence`.

Deliverable: working auth, guest browsing, reels comments/follow, working calls & chat.

---

## Phase 2 — Liquid Glass Design System

- New tokens in `index.css`: `--glass-bg`, `--glass-border`, `--glass-blur`, `--shadow-elegant`, gradient tokens.
- `GlassCard`, `GlassNav`, `GlassSheet` primitives.
- Fonts: SF Pro Display (display), Inter (body), Noto Naskh Arabic, Noto Nastaliq Urdu — auto-switch by content language.
- Apply to TopBar, BottomNav, PostCard, ReelItem, CallScreen, CommentsSheet, Sheets/Dialogs.
- Home redesign: Trending Reels rail, Latest Posts, Suggested Users, Community Recommendations.

I will use the redesign skill (screenshot → 3 rendered directions → you pick one) before touching global styles.

---

## Phase 3 — Universal Publisher + Hiring/Support unification

- One `/create` flow with 4 steps: Media → Details → SEO → Purpose (post / reel / hiring / support-request / support-offer / announcement).
- DB: add `purpose`, `seo_title`, `seo_description`, `seo_keywords`, `hashtags`, `category`, `location` to `posts`; unify `jobs` display as a `purpose=hiring` post with a `job_id` link.
- Hiring inline card with all fields + "Apply Now" opens application form (name, email, phone, country, city, education, experience, skills, resume upload, cover letter).
- Employer Dashboard `/employer`: My Jobs → applications (pending/approved/rejected) → approve / reject / message applicant.
- Profile tabs expand: Posts, Reels, Jobs, Support, Followers, Following + stats.

---

## Phase 4 — Performance, Notifications, Admin polish, QA

- Reels playback: preload next 3 + keep prev 2 in-memory only; blob URLs revoked on eviction; no persistent cache.
- Thumbnails: session Map cache, cleared on unload.
- Infinite scroll on Home + Explore.
- Notifications: add job_application / approval / rejection / support triggers; enable browser + realtime toast.
- Admin panel: verify User/Reports/Content/Jobs/Support/Verification pages against new schema.
- Final QA sweep with Playwright: auth, reels comment/like/follow, post upload, chat send, call ring, job apply, notification receipt.

---

## Technical notes (for reference)

- DB additions in Phase 3 (single migration): `posts.purpose`, `posts.seo_*`, `posts.hashtags text[]`, `posts.category`, `posts.location`, `job_applications` extra columns (country, city, education, experience, skills, resume_url, cover_letter).
- Storage: reuse `media` bucket for resumes under `resumes/{user_id}/`.
- OAuth callback route added to `App.tsx`; existing `Auth.tsx` migrated to `lovable.auth.signInWithOAuth`.
- Liquid Glass tokens land in `index.css` + `tailwind.config.ts`; components rewritten to use tokens (no hardcoded colors).
- Reels memory cache: `useRef<Map<id, HTMLVideoElement>>`; only current ± window kept mounted.

---

**Recommended next step:** approve Phase 1. I'll ship it, we verify on the live preview, then move to Phase 2 (which will trigger the redesign flow with visual direction picks).

If you'd rather I compress phases (e.g. combine 1+2 or 3+4), tell me which and I'll adjust before starting.
