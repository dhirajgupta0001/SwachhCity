-- Phase 11: Feedback & Quality Schema

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_id UUID NOT NULL REFERENCES public.profiles(id),
  complaint_id UUID REFERENCES public.complaints(id),
  pickup_request_id UUID REFERENCES public.pickup_requests(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  admin_response TEXT,
  responded_by UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure exactly one operation is referenced
  CONSTRAINT feedback_single_reference CHECK (
    (complaint_id IS NOT NULL AND pickup_request_id IS NULL) OR
    (complaint_id IS NULL AND pickup_request_id IS NOT NULL)
  ),
  
  -- Prevent duplicates (Null values in Postgres UNIQUE constraints allow multiple nulls, but since one is populated, this works perfectly)
  -- Actually, to be strictly correct, we can just use UNIQUE index on the non-null columns.
  -- Or just use:
  CONSTRAINT unique_complaint_feedback UNIQUE NULLS NOT DISTINCT (citizen_id, complaint_id),
  CONSTRAINT unique_pickup_feedback UNIQUE NULLS NOT DISTINCT (citizen_id, pickup_request_id)
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Citizens can read their own feedback
CREATE POLICY "Citizens can read own feedback"
  ON public.feedback
  FOR SELECT
  USING (auth.uid() = citizen_id);

-- Policy: Citizens can insert their own feedback
CREATE POLICY "Citizens can insert own feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

-- Policy: Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Policy: Admins can update all feedback (to add responses)
CREATE POLICY "Admins can update feedback"
  ON public.feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_citizen ON public.feedback(citizen_id);
CREATE INDEX IF NOT EXISTS idx_feedback_complaint ON public.feedback(complaint_id);
CREATE INDEX IF NOT EXISTS idx_feedback_pickup ON public.feedback(pickup_request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);
