-- Extend posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_slug text,
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS donation_id uuid;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_purpose_check
  CHECK (purpose IN ('post','reel','hiring','support_request','support_offer','announcement'));

CREATE UNIQUE INDEX IF NOT EXISTS posts_seo_slug_unique ON public.posts(seo_slug) WHERE seo_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_purpose_created_idx ON public.posts(purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_category_idx ON public.posts(category);
CREATE INDEX IF NOT EXISTS posts_hashtags_gin ON public.posts USING gin(hashtags);

-- FK links (deferred, nullable)
ALTER TABLE public.posts
  ADD CONSTRAINT posts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD CONSTRAINT posts_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES public.donations(id) ON DELETE SET NULL;

-- Extend jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS apply_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS remote boolean NOT NULL DEFAULT false;

-- Extend job_applications
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS cover_letter text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_notes text;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS job_applications_job_status_idx ON public.job_applications(job_id, status);

-- Employer visibility & moderation of applications
CREATE POLICY "Employers view applications on own jobs"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_applications.job_id AND j.poster_id = auth.uid()
    )
  );

CREATE POLICY "Employers update applications on own jobs"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_applications.job_id AND j.poster_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_applications.job_id AND j.poster_id = auth.uid()
    )
  );

-- Notifications
CREATE OR REPLACE FUNCTION public.notify_job_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE employer uuid; job_title text; applicant_name text;
BEGIN
  SELECT poster_id, title INTO employer, job_title FROM public.jobs WHERE id = NEW.job_id;
  IF employer IS NULL OR employer = NEW.applicant_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO applicant_name FROM public.profiles WHERE user_id = NEW.applicant_id;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (employer, 'job_application', applicant_name || ' applied to ' || COALESCE(job_title,'your job'),
          LEFT(COALESCE(NEW.cover_letter, NEW.message, ''), 120),
          jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id, 'actor_id', NEW.applicant_id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_job_application ON public.job_applications;
CREATE TRIGGER trg_notify_job_application
AFTER INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_job_application();

CREATE OR REPLACE FUNCTION public.notify_job_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job_title text; verb text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved','rejected') THEN RETURN NEW; END IF;
  SELECT title INTO job_title FROM public.jobs WHERE id = NEW.job_id;
  verb := CASE NEW.status WHEN 'approved' THEN 'approved' ELSE 'declined' END;
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (NEW.applicant_id, 'job_application_status',
          'Your application was ' || verb,
          COALESCE(job_title, 'A job you applied to') || ' — ' || verb,
          jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id, 'status', NEW.status));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_job_application_status ON public.job_applications;
CREATE TRIGGER trg_notify_job_application_status
AFTER UPDATE OF status ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_job_application_status();