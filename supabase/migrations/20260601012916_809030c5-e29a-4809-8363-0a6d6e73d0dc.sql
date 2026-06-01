
CREATE OR REPLACE FUNCTION public.is_admin_tier(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin'::app_role,'moderator'::app_role,'support'::app_role))
$$;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  ai_flag boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "reports_update_admin" ON public.reports FOR UPDATE TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "reports_delete_admin" ON public.reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid NOT NULL,
  title text NOT NULL,
  company text,
  location text,
  description text NOT NULL,
  job_type text DEFAULT 'full_time',
  salary_range text,
  contact_link text,
  status text NOT NULL DEFAULT 'pending',
  applicants_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select" ON public.jobs FOR SELECT TO authenticated USING (status='approved' OR poster_id = auth.uid() OR public.is_admin_tier(auth.uid()));
CREATE POLICY "jobs_insert" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "jobs_update" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = poster_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "jobs_delete" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = poster_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);
GRANT SELECT, INSERT, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "japp_insert" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "japp_select" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = applicant_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "japp_delete" ON public.job_applications FOR DELETE TO authenticated USING (auth.uid() = applicant_id);

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric,
  currency text DEFAULT 'USD',
  contact text,
  status text NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations_select" ON public.donations FOR SELECT TO authenticated USING (status='approved' OR user_id = auth.uid() OR public.is_admin_tier(auth.uid()));
CREATE POLICY "donations_insert" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "donations_update" ON public.donations FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "donations_delete" ON public.donations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "tickets_insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_update" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_admin_tier(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "tickets_delete" ON public.support_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  target text NOT NULL DEFAULT 'all',
  target_user_ids uuid[],
  scheduled_for timestamptz,
  sent boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_notifications TO authenticated;
GRANT ALL ON public.scheduled_notifications TO service_role;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_select" ON public.scheduled_notifications FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "sched_insert" ON public.scheduled_notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin_tier(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "sched_update" ON public.scheduled_notifications FOR UPDATE TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "sched_delete" ON public.scheduled_notifications FOR DELETE TO authenticated USING (public.is_admin_tier(auth.uid()));

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "settings_update" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "settings_delete" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select" ON public.admin_logs FOR SELECT TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "logs_insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin_tier(auth.uid()) AND admin_id = auth.uid());

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS restricted boolean NOT NULL DEFAULT false;
