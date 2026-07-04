## Phase 3 — Universal Publisher + Hiring/Support Unification

Goal: One create flow (`/create`) that publishes any content type — post, reel, hiring, support request, support offer, announcement — into a single feed model, plus a proper Employer/Applicant flow.

---

### 1. Data model (single migration)

Extend `posts` to be the unified content record. Keep `jobs` and `donations` as detail rows linked back to a post.

`posts` new columns:
- `purpose` text NOT NULL DEFAULT `'post'` — enum-ish: `post | reel | hiring | support_request | support_offer | announcement`
- `title` text (optional headline, used by hiring/support)
- `category` text (e.g. `tech`, `education`, `medical`, `food`, `zakat`)
- `location` text
- `hashtags` text[] NOT NULL DEFAULT `'{}'`
- `seo_title` text, `seo_description` text, `seo_slug` text unique-nullable
- `job_id` uuid nullable → `jobs.id` (for `purpose='hiring'`)
- `donation_id` uuid nullable → `donations.id` (for `purpose='support_request'`)

`jobs` new columns (fill hiring form):
- `country`, `city`, `experience_level`, `education_level`, `skills` text[], `apply_deadline` timestamptz, `remote` boolean

`job_applications` new columns:
- `full_name`, `email`, `phone`, `country`, `city`, `education`, `experience`, `skills` text[], `resume_url`, `cover_letter`, `status` text default `'pending'` (pending/approved/rejected), `reviewed_at`, `reviewer_notes`

Indexes on `posts(purpose, created_at desc)`, `posts(category)`, `posts using gin(hashtags)`.

RLS: keep existing post policies; add "employer can read applications for their jobs" policy on `job_applications` via `posts.user_id = auth.uid()` join through `jobs`.

### 2. Universal Publisher UI — `/create`

Replace `CreatePost.tsx` + `CreateReel.tsx` with a single stepper at `src/pages/Create.tsx`:

```
Step 1  Media       image / video / none (auto-detects reel if vertical video)
Step 2  Details     caption, title, category, location, hashtags
Step 3  SEO         seo_title, seo_description, auto slug
Step 4  Purpose     radio: Post · Reel · Hiring · Support request · Support offer · Announcement
                    → renders purpose-specific sub-form (JobFields / SupportFields)
```

New components under `src/components/create/`:
- `MediaStep.tsx`, `DetailsStep.tsx`, `SeoStep.tsx`, `PurposeStep.tsx`
- `HiringFields.tsx` — company, role, type, salary, remote, deadline, skills, country/city, education, experience
- `SupportFields.tsx` — amount, currency, category, contact, target audience

Publishing writes to `posts` in one transaction; if purpose=hiring also insert into `jobs` and set `job_id`; if support_request also insert into `donations` and set `donation_id`. Reels remain in `reels` table but a mirror row lands in `posts` with `purpose='reel'` for unified feed queries.

Old `CreatePost` / `CreateReel` routes redirect to `/create?purpose=post|reel`.

### 3. Feed rendering

- `PostCard.tsx` dispatches by `post.purpose`:
  - `post`, `announcement` → current layout
  - `hiring` → inline `HiringCard` with title/company/location/salary chips + **Apply Now** button
  - `support_request` → inline `SupportCard` with progress bar + **Support** button
  - `reel` → link chip to `/reels/:id`
- `HiringCard` opens `ApplyDialog` (name, email, phone, country, city, education, experience, skills chips, resume upload to `media` bucket, cover letter). Writes to `job_applications`, increments `jobs.applicants_count`, triggers notification to employer.

### 4. Employer Dashboard — `/employer`

New page `src/pages/Employer.tsx` (auth-required):
- Tab "My Jobs" — list of hiring posts by current user with counts
- Click job → applicants panel: filter pending/approved/rejected
- Row actions: Approve, Reject, Message (opens conversation), View resume
- Approve/Reject calls edge function `review-application` that updates status, sets `reviewed_at`, notifies applicant

Link entry point from Profile menu and from each own HiringCard ("Manage applicants").

### 5. Profile tabs

Add tabs on `Profile.tsx` + `UserProfilePage.tsx`:
`Posts · Reels · Hiring · Support · Saves`

Each tab queries `posts` filtered by `purpose` and owner.

### 6. Wiring & cleanup

- Route registration in `src/App.tsx`: `/create`, `/employer`; keep `/jobs` (browse) but source from `posts where purpose='hiring'`.
- `BottomNav` "+" button → `/create`.
- Update `fetchPostsWithProfiles` to include new columns.
- Deprecate direct `CreatePost` / `CreateReel` UI (keep files as thin wrappers routing to `/create`).

### 7. Notifications

Add triggers:
- `job_application` inserted → notify employer
- `job_applications.status` changed to approved/rejected → notify applicant
- `support_request` new pledge → notify requester (existing donation flow reused)

### Technical details

- Migration is one file with all schema, grants, RLS, triggers.
- `Create.tsx` uses `react-hook-form` + `zod` for validation per step.
- Resume upload: `media` bucket, path `resumes/{user_id}/{uuid}.pdf`, max 5MB, PDF/DOC only.
- Employer approval uses edge function `review-application` (verify_jwt=false, JWT validated in code) so we can atomically update + notify.
- Reuse `GuestHero` gating: unauthenticated Apply → `LoginPromptDialog`.

### Out of scope for this phase
- Payments for support/donations (Phase 4)
- Home hero redesign polish (done in Phase 2)
- Reels performance cache eviction (Phase 4)
- Admin panel updates for new purposes (Phase 4)

Approve to start with the migration, then Universal Publisher, then Employer dashboard.