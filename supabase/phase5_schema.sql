-- SwachhCity Phase 5: Waste Collector Experience Schema Updates

-- 1. Policies to allow Collectors to access and update their assigned Complaints
CREATE POLICY "Collectors can view assigned complaints." 
  ON public.complaints FOR SELECT 
  USING (assigned_collector_id = auth.uid());

CREATE POLICY "Collectors can update assigned complaints." 
  ON public.complaints FOR UPDATE 
  USING (assigned_collector_id = auth.uid())
  WITH CHECK (assigned_collector_id = auth.uid());

CREATE POLICY "Collectors can view status history of assigned complaints." 
  ON public.complaint_status_history FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.complaints WHERE id = complaint_status_history.complaint_id AND assigned_collector_id = auth.uid()));

CREATE POLICY "Collectors can insert status history for assigned complaints." 
  ON public.complaint_status_history FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.complaints WHERE id = complaint_status_history.complaint_id AND assigned_collector_id = auth.uid()));


-- 2. Policies to allow Collectors to access and update their assigned Pickups
CREATE POLICY "Collectors can view assigned pickups." 
  ON public.pickup_requests FOR SELECT 
  USING (assigned_collector_id = auth.uid());

CREATE POLICY "Collectors can update assigned pickups." 
  ON public.pickup_requests FOR UPDATE 
  USING (assigned_collector_id = auth.uid())
  WITH CHECK (assigned_collector_id = auth.uid());

CREATE POLICY "Collectors can view status history of assigned pickups." 
  ON public.pickup_status_history FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pickup_requests WHERE id = pickup_status_history.pickup_request_id AND assigned_collector_id = auth.uid()));

CREATE POLICY "Collectors can insert status history for assigned pickups." 
  ON public.pickup_status_history FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pickup_requests WHERE id = pickup_status_history.pickup_request_id AND assigned_collector_id = auth.uid()));


-- 3. Collection Evidence Table
CREATE TABLE public.collection_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL, -- References either complaints.id or pickup_requests.id
  task_type TEXT NOT NULL CHECK (task_type IN ('COMPLAINT', 'PICKUP')),
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.collection_evidence ENABLE ROW LEVEL SECURITY;

-- Evidence Policies
-- Collectors can view evidence they uploaded
CREATE POLICY "Collectors can view own uploaded evidence." 
  ON public.collection_evidence FOR SELECT 
  USING (uploaded_by = auth.uid());

-- Collectors can insert evidence
CREATE POLICY "Collectors can insert evidence." 
  ON public.collection_evidence FOR INSERT 
  WITH CHECK (uploaded_by = auth.uid());

-- Admins can view all evidence
CREATE POLICY "Admins can view all collection evidence." 
  ON public.collection_evidence FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Citizens can view evidence for their own tasks
CREATE POLICY "Citizens can view evidence for their complaints." 
  ON public.collection_evidence FOR SELECT 
  USING (
    task_type = 'COMPLAINT' AND EXISTS (SELECT 1 FROM public.complaints WHERE id = collection_evidence.task_id AND citizen_id = auth.uid())
  );

CREATE POLICY "Citizens can view evidence for their pickups." 
  ON public.collection_evidence FOR SELECT 
  USING (
    task_type = 'PICKUP' AND EXISTS (SELECT 1 FROM public.pickup_requests WHERE id = collection_evidence.task_id AND citizen_id = auth.uid())
  );


-- 4. Storage Setup for Collection Evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('collection-evidence', 'collection-evidence', false) ON CONFLICT DO NOTHING;

-- Storage Policies
-- Collectors can upload their own evidence
CREATE POLICY "Collectors can upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'collection-evidence' AND (storage.foldername(name))[1] = auth.uid()::text
);
-- Collectors can view own evidence
CREATE POLICY "Collectors can view own evidence" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'collection-evidence' AND (storage.foldername(name))[1] = auth.uid()::text
);
-- Admins can view all evidence
CREATE POLICY "Admins can view all evidence" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'collection-evidence' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
-- Note: Citizen viewing policy for storage requires a more complex join or server-side signed URL generation.
-- We will use Server-Side signed URLs to grant Citizens access to collector evidence, keeping the bucket locked.
