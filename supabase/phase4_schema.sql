-- SwachhCity Phase 4: Waste Pickup Requests Schema

-- Enums
CREATE TYPE pickup_status AS ENUM (
  'PENDING', 'APPROVED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'
);

CREATE TYPE pickup_quantity AS ENUM (
  'SMALL', 'MEDIUM', 'LARGE', 'VERY_LARGE'
);

CREATE TYPE pickup_time_window AS ENUM (
  'MORNING', 'AFTERNOON', 'EVENING'
);

-- Waste Types Table
CREATE TABLE public.waste_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed Waste Types
INSERT INTO public.waste_types (name, description) VALUES
  ('Household Waste', 'Standard daily household garbage.'),
  ('Recyclable Waste', 'Dry waste like paper, plastic, glass, and metal.'),
  ('Organic / Wet Waste', 'Biodegradable kitchen and garden waste.'),
  ('E-Waste', 'Electronic items, batteries, and appliances.'),
  ('Bulk Waste', 'Large furniture, mattresses, and bulk items.'),
  ('Other', 'Other specific waste types.');

-- Pickup Requests Table
CREATE TABLE public.pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  citizen_id UUID NOT NULL REFERENCES public.profiles(id),
  waste_type_id UUID NOT NULL REFERENCES public.waste_types(id),
  description TEXT NOT NULL,
  quantity pickup_quantity NOT NULL DEFAULT 'MEDIUM',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  preferred_date DATE NOT NULL,
  preferred_time_window pickup_time_window NOT NULL,
  status pickup_status NOT NULL DEFAULT 'PENDING',
  assigned_collector_id UUID REFERENCES public.profiles(id),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Pickup Status History Table
CREATE TABLE public.pickup_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_request_id UUID NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  status pickup_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Generate Reference ID function
CREATE OR REPLACE FUNCTION public.generate_pickup_reference()
RETURNS trigger AS $$
DECLARE
  year TEXT;
  seq_val INT;
BEGIN
  year := to_char(NEW.created_at, 'YYYY');
  SELECT COUNT(*) INTO seq_val FROM public.pickup_requests WHERE to_char(created_at, 'YYYY') = year;
  NEW.reference_id := 'PK-' || year || '-' || LPAD((seq_val + 1)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_pickup_reference
  BEFORE INSERT ON public.pickup_requests
  FOR EACH ROW EXECUTE PROCEDURE public.generate_pickup_reference();

-- Auto-insert PENDING status history
CREATE OR REPLACE FUNCTION public.log_initial_pickup_status()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.pickup_status_history (pickup_request_id, status, notes, changed_by)
  VALUES (NEW.id, NEW.status, 'Pickup request submitted by citizen.', NEW.citizen_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_pickup_creation_status
  AFTER INSERT ON public.pickup_requests
  FOR EACH ROW EXECUTE PROCEDURE public.log_initial_pickup_status();

-- Updated_at trigger
CREATE TRIGGER on_pickups_updated
  BEFORE UPDATE ON public.pickup_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_status_history ENABLE ROW LEVEL SECURITY;

-- Waste Types Policies
CREATE POLICY "Waste Types are viewable by everyone." ON public.waste_types FOR SELECT USING (true);

-- Pickup Requests Policies
CREATE POLICY "Citizens can view their own pickups." ON public.pickup_requests FOR SELECT USING (auth.uid() = citizen_id);
CREATE POLICY "Citizens can insert their own pickups." ON public.pickup_requests FOR INSERT WITH CHECK (auth.uid() = citizen_id AND status = 'PENDING');
-- Allow citizens to cancel their own PENDING or APPROVED requests
CREATE POLICY "Citizens can cancel their own pickups." ON public.pickup_requests FOR UPDATE USING (
  auth.uid() = citizen_id AND status IN ('PENDING', 'APPROVED')
) WITH CHECK (
  auth.uid() = citizen_id AND status = 'CANCELLED'
);

CREATE POLICY "Admins can view all pickups." ON public.pickup_requests FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can update all pickups." ON public.pickup_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Status History Policies
CREATE POLICY "Citizens can view status history of their pickups." ON public.pickup_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pickup_requests WHERE id = pickup_status_history.pickup_request_id AND citizen_id = auth.uid())
);
-- Allow citizens to insert cancellation records
CREATE POLICY "Citizens can insert status history for cancellation." ON public.pickup_status_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pickup_requests WHERE id = pickup_status_history.pickup_request_id AND citizen_id = auth.uid()) 
  AND status = 'CANCELLED'
);

CREATE POLICY "Admins can view all pickup status history." ON public.pickup_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
