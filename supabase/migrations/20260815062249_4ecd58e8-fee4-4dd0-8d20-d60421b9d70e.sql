
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.audit_type AS ENUM ('Product', 'Process', 'Revalidation');
CREATE TYPE public.audit_status AS ENUM ('Planned', 'Assigned', 'In Progress', 'Submitted', 'Completed', 'Deviation', 'Overdue');
CREATE TYPE public.deviation_status AS ENUM ('Open', 'Under Review', 'Action Assigned', 'Closed');

-- EMPLOYEES ROSTER
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Production',
  designation TEXT NOT NULL DEFAULT 'Operator',
  role public.app_role NOT NULL DEFAULT 'employee',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  employee_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Production',
  designation TEXT NOT NULL DEFAULT 'Operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- LOGIN CODES (server only)
CREATE TABLE public.login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_codes TO service_role;
ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

-- AUDIT PLANS
CREATE TABLE public.audit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  audit_type public.audit_type NOT NULL DEFAULT 'Product',
  area TEXT NOT NULL DEFAULT 'General',
  frequency TEXT NOT NULL DEFAULT 'Monthly',
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_plans TO authenticated;
GRANT ALL ON public.audit_plans TO service_role;
ALTER TABLE public.audit_plans ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS
CREATE TABLE public.audit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.audit_plans(id) ON DELETE SET NULL,
  audit_code TEXT NOT NULL DEFAULT ('AUD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  title TEXT NOT NULL,
  audit_type public.audit_type NOT NULL DEFAULT 'Product',
  area TEXT NOT NULL DEFAULT 'General',
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  assigned_to UUID NOT NULL,
  assigned_to_employee_number TEXT NOT NULL,
  assigned_by UUID,
  status public.audit_status NOT NULL DEFAULT 'Assigned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_assignments TO authenticated;
GRANT ALL ON public.audit_assignments TO service_role;
ALTER TABLE public.audit_assignments ENABLE ROW LEVEL SECURITY;

-- RECORDS
CREATE TABLE public.audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.audit_assignments(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  employee_number TEXT NOT NULL,
  checkpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations TEXT,
  image_1_url TEXT,
  image_2_url TEXT,
  image_3_url TEXT,
  signature_name TEXT,
  signature_ref TEXT,
  signed_at TIMESTAMPTZ,
  status public.audit_status NOT NULL DEFAULT 'In Progress',
  locked BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_records TO authenticated;
GRANT ALL ON public.audit_records TO service_role;
ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;

-- DEVIATIONS
CREATE TABLE public.audit_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.audit_assignments(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.audit_records(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL,
  employee_number TEXT NOT NULL,
  description TEXT NOT NULL,
  location_operation TEXT NOT NULL,
  observed_condition TEXT NOT NULL,
  recommended_action TEXT,
  evidence_url TEXT,
  severity TEXT NOT NULL DEFAULT 'Medium',
  status public.deviation_status NOT NULL DEFAULT 'Open',
  corrective_action TEXT,
  closed_by UUID,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_deviations TO authenticated;
GRANT ALL ON public.audit_deviations TO service_role;
ALTER TABLE public.audit_deviations ENABLE ROW LEVEL SECURITY;

-- LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_employee_number TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "roster readable" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles readable by self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "plans readable" ON public.audit_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans admin write" ON public.audit_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plans admin update" ON public.audit_plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plans admin delete" ON public.audit_plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "assignments visible" ON public.audit_assignments FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "assignments admin insert" ON public.audit_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "assignments update" ON public.audit_assignments FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "assignments admin delete" ON public.audit_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "records visible" ON public.audit_records FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "records own insert" ON public.audit_records FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "records update" ON public.audit_records FOR UPDATE TO authenticated
  USING ((submitted_by = auth.uid() AND locked = false) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "records admin delete" ON public.audit_records FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "deviations visible" ON public.audit_deviations FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "deviations own insert" ON public.audit_deviations FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());
CREATE POLICY "deviations admin update" ON public.audit_deviations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "deviations admin delete" ON public.audit_deviations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "logs admin read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "logs insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_assignments_touch BEFORE UPDATE ON public.audit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_records_touch BEFORE UPDATE ON public.audit_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_deviations_touch BEFORE UPDATE ON public.audit_deviations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SEED ROSTER
INSERT INTO public.employees (employee_number, full_name, department, designation, role) VALUES
  ('1001', 'R. Manikandan', 'Quality Assurance', 'Audit Manager', 'admin'),
  ('1002', 'S. Priya', 'Quality Assurance', 'QA Engineer', 'employee'),
  ('1003', 'K. Arun Kumar', 'Machine Shop', 'Line Supervisor', 'employee'),
  ('1004', 'M. Deepa', 'Assembly', 'Process Inspector', 'employee'),
  ('1005', 'V. Saravanan', 'Heat Treatment', 'Shift Engineer', 'employee');

-- SEED PLANS
INSERT INTO public.audit_plans (year, title, audit_type, area, frequency, description) VALUES
  (2026, 'Annual Product Audit Plan - Crankshaft Line', 'Product', 'Machine Shop', 'Monthly', 'Dimensional and visual compliance of finished crankshafts.'),
  (2026, 'Process Audit Plan - Assembly Cell 3', 'Process', 'Assembly', 'Monthly', 'Adherence to standard operating procedures on assembly cell 3.'),
  (2026, 'Revalidation Plan - Heat Treatment Furnace', 'Revalidation', 'Heat Treatment', 'Quarterly', 'Periodic revalidation of furnace parameters and calibration.');
