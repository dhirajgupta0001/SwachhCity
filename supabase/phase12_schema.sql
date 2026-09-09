-- Phase 12 Security Hardening

-- 1. Prevent non-admins from updating their own role or status
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the user making the change is NOT an admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    -- They cannot change their role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Permission denied: Cannot change role';
    END IF;
    -- They cannot change their status
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Permission denied: Cannot change account status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_privileges ON public.profiles;
CREATE TRIGGER enforce_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_privileges();

-- 2. Allow Collectors to view complaint evidence for their assigned complaints
CREATE POLICY "Collectors can view assigned complaint evidence" 
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'complaint-evidence' AND EXISTS (
    SELECT 1 FROM public.complaints c
    JOIN public.complaint_photos cp ON cp.complaint_id = c.id
    WHERE cp.storage_path = storage.objects.name
    AND c.assigned_collector_id = auth.uid()
  )
);

-- 3. Revoke insecure notification RPC
REVOKE EXECUTE ON FUNCTION public.create_system_notification FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_system_notification FROM anon;
-- Drop it entirely to prevent bypass
DROP FUNCTION IF EXISTS public.create_system_notification;
