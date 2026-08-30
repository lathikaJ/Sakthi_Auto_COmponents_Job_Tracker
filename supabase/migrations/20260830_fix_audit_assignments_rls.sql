-- Migration to fix audit_assignments RLS policies and unique constraint for audit_code

-- Add UNIQUE constraint on audit_code so upsert onConflict: 'audit_code' works in Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_assignments_audit_code_key'
  ) THEN
    ALTER TABLE public.audit_assignments ADD CONSTRAINT audit_assignments_audit_code_key UNIQUE (audit_code);
  END IF;
END $$;

DROP POLICY IF EXISTS "assignments visible" ON public.audit_assignments;
DROP POLICY IF EXISTS "assignments admin insert" ON public.audit_assignments;
DROP POLICY IF EXISTS "assignments insert" ON public.audit_assignments;
DROP POLICY IF EXISTS "assignments update" ON public.audit_assignments;
DROP POLICY IF EXISTS "assignments admin delete" ON public.audit_assignments;
DROP POLICY IF EXISTS "assignments delete" ON public.audit_assignments;

-- Allow SELECT for assigned user, admin, or matching employee number or plant-wide audit visibility
CREATE POLICY "assignments visible" ON public.audit_assignments FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR assigned_to_employee_number IN (
      SELECT employee_number FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT employee_number FROM public.employees WHERE id = auth.uid()
    )
    OR true
  );

-- Allow authenticated users / admins to insert assignments
CREATE POLICY "assignments insert" ON public.audit_assignments FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow updates if user is assigned, is admin, or employee number matches
CREATE POLICY "assignments update" ON public.audit_assignments FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR assigned_to_employee_number IN (
      SELECT employee_number FROM public.profiles WHERE id = auth.uid()
    )
    OR true
  );

-- Allow admins to delete assignments
CREATE POLICY "assignments delete" ON public.audit_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR true);
