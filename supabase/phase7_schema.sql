-- SwachhCity Phase 7: Notifications Schema Updates

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT, -- e.g., 'COMPLAINT', 'PICKUP', 'USER'
  related_entity_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
  ON public.notifications FOR SELECT 
  USING (recipient_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- No direct client INSERT policy. All insertions go through the SECURITY DEFINER function below.

-- Function to safely insert notifications from trusted backend/database triggers without exposing client INSERT
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, message, related_entity_type, related_entity_id)
  VALUES (p_recipient_id, p_type, p_title, p_message, p_entity_type, p_entity_id);
END;
$$;

-- Grant execute to authenticated users (so Next.js Server Actions using the user's session can call it securely)
GRANT EXECUTE ON FUNCTION public.create_system_notification TO authenticated;
