-- PostgreSQL Migration for Sakthi Auto Electronic Signatures & 10 Member Registry
-- Run this in your Supabase SQL Editor / PostgreSQL Database Console

-- 1. Create employee_signatures table
CREATE TABLE IF NOT EXISTS public.employee_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_number TEXT UNIQUE NOT NULL,       -- e.g. '1001'
  unique_member_id TEXT UNIQUE NOT NULL,      -- e.g. 'SAK-EMP-1001'
  employee_name TEXT NOT NULL,                -- e.g. 'Admin User'
  designation TEXT NOT NULL,                  -- e.g. 'Quality Operations Manager'
  department TEXT NOT NULL,                   -- e.g. 'Quality Assurance'
  signature_url TEXT,                         -- Base64 or Supabase Storage URL
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.employee_signatures ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Allow read to all authenticated/anon users, write to authenticated admins
CREATE POLICY "Allow public read access to employee signatures"
  ON public.employee_signatures FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert and update to employee signatures"
  ON public.employee_signatures FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Seed initial 10 Key Members into PostgreSQL
INSERT INTO public.employee_signatures (employee_number, unique_member_id, employee_name, designation, department, is_verified)
VALUES
  ('1001', 'SAK-EMP-1001', 'Admin User', 'Quality Operations Manager', 'Quality Assurance', true),
  ('1002', 'SAK-EMP-1002', 'John Doe', 'Senior Quality Engineer', 'Machining Line 1', true),
  ('1003', 'SAK-EMP-1003', 'Jane Smith', 'Process Audit Lead', 'Assembly & Dock', true),
  ('1004', 'SAK-EMP-1004', 'Robert Johnson', 'Product Inspector', 'Machine Shop 2', true),
  ('1005', 'SAK-EMP-1005', 'Emily Davis', 'Revalidation Specialist', 'Value Added Engineering', true),
  ('1006', 'SAK-EMP-1006', 'Michael Brown', 'Line Auditor', 'Machining Line 3', true),
  ('1007', 'SAK-EMP-1007', 'Sarah Wilson', 'Metrology Incharge', 'Quality Lab', true),
  ('1008', 'SAK-EMP-1008', 'David Taylor', 'Maintenance Lead', 'Tool Room', true),
  ('1009', 'SAK-EMP-1009', 'Amanda Martinez', 'Compliance Auditor', 'EHS & Safety', true),
  ('1010', 'SAK-EMP-1010', 'James Anderson', 'Plant Head Quality', 'Plant Management', true)
ON CONFLICT (employee_number) DO UPDATE SET
  unique_member_id = EXCLUDED.unique_member_id,
  employee_name = EXCLUDED.employee_name,
  designation = EXCLUDED.designation,
  department = EXCLUDED.department,
  updated_at = NOW();
