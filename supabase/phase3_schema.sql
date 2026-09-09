-- SwachhCity Phase 3: Complaints Schema

-- Enums
CREATE TYPE complaint_status AS ENUM (
  'NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'
);

CREATE TYPE complaint_priority AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'URGENT'
);

-- Categories Table
CREATE TABLE public.complaint_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed Categories
INSERT INTO public.complaint_categories (name, description) VALUES
  ('Overflowing Garbage Bin', 'Public garbage bins that are full and overflowing.'),
  ('Missed Waste Collection', 'Scheduled waste collection did not happen.'),
  ('Illegal Dumping', 'Waste dumped in unauthorized areas.'),
  ('Roadside Garbage', 'Accumulated garbage along streets or sidewalks.'),
  ('Construction Waste', 'Improper disposal of building materials and debris.'),
  ('Drainage / Sanitation Issue', 'Blocked drains or severe sanitation problems.'),
  ('Other', 'Other waste management related issues.');

-- Complaints Table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  citizen_id UUID NOT NULL REFERENCES public.profiles(id),
  category_id UUID NOT NULL REFERENCES public.complaint_categories(id),
  description TEXT NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'MEDIUM',
  status complaint_status NOT NULL DEFAULT 'NEW',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  assigned_collector_id UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Complaint Photos Table
CREATE TABLE public.complaint_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Complaint Status History Table
CREATE TABLE public.complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status complaint_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Generate Reference ID function
CREATE OR REPLACE FUNCTION public.generate_complaint_reference()
RETURNS trigger AS $$
DECLARE
  year TEXT;
  seq_val INT;
BEGIN
  year := to_char(NEW.created_at, 'YYYY');
  -- Simple counter based on count for the year
  SELECT COUNT(*) INTO seq_val FROM public.complaints WHERE to_char(created_at, 'YYYY') = year;
  NEW.reference_id := 'SC-' || year || '-' || LPAD((seq_val + 1)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_complaint_reference
  BEFORE INSERT ON public.complaints
  FOR EACH ROW EXECUTE PROCEDURE public.generate_complaint_reference();

-- Auto-insert NEW status history
CREATE OR REPLACE FUNCTION public.log_initial_complaint_status()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.complaint_status_history (complaint_id, status, notes, changed_by)
  VALUES (NEW.id, NEW.status, 'Complaint submitted by citizen.', NEW.citizen_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_complaint_creation_status
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE PROCEDURE public.log_initial_complaint_status();

-- Updated_at trigger
CREATE TRIGGER on_complaints_updated
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Categories are viewable by everyone." ON public.complaint_categories FOR SELECT USING (true);

-- Complaints Policies
CREATE POLICY "Citizens can view their own complaints." ON public.complaints FOR SELECT USING (auth.uid() = citizen_id);
CREATE POLICY "Citizens can insert their own complaints." ON public.complaints FOR INSERT WITH CHECK (auth.uid() = citizen_id AND status = 'NEW');
CREATE POLICY "Admins can view all complaints." ON public.complaints FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can update all complaints." ON public.complaints FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Complaint Photos Policies
CREATE POLICY "Citizens can view photos of their complaints." ON public.complaint_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.complaints WHERE id = complaint_photos.complaint_id AND citizen_id = auth.uid())
);
CREATE POLICY "Citizens can insert photos for their complaints." ON public.complaint_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.complaints WHERE id = complaint_photos.complaint_id AND citizen_id = auth.uid())
);
CREATE POLICY "Admins can view all photos." ON public.complaint_photos FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Status History Policies
CREATE POLICY "Citizens can view status history of their complaints." ON public.complaint_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.complaints WHERE id = complaint_status_history.complaint_id AND citizen_id = auth.uid())
);
CREATE POLICY "Admins can view all status history." ON public.complaint_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Storage Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-evidence', 'complaint-evidence', false) ON CONFLICT DO NOTHING;

-- Storage Policies
-- Note: Assuming standard Supabase storage configuration
CREATE POLICY "Citizens can upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'complaint-evidence' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Citizens can view own evidence" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'complaint-evidence' AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Admins can view all evidence" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'complaint-evidence' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
