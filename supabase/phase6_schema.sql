-- SwachhCity Phase 6: Municipal Admin Experience Schema Updates

-- 1. Audit Logs Table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- e.g., 'USER', 'COMPLAINT', 'PICKUP_REQUEST'
  entity_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" 
  ON public.audit_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- System/Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" 
  ON public.audit_logs FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));


-- 2. Confirm Profiles Update Policy (from Phase 2, but let's ensure it's fully correct for Admin updates)
-- We'll drop and recreate if needed, or just add an explicit one if missing.
-- Admins can update any profile (role, status)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Also ensure Admins can select all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));


-- 3. Views for Collector Workload (Optional convenience view, but let's just do it in JS for flexibility)
-- We will query active tasks directly.

