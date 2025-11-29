-- Create people table
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory_updates table
CREATE TABLE public.memory_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation_history table
CREATE TABLE public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Create public read policies (for dementia app - no auth required for simplicity)
CREATE POLICY "Allow public read access to people" 
ON public.people FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to memory_updates" 
ON public.memory_updates FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to conversation_history" 
ON public.conversation_history FOR SELECT 
USING (true);

-- Allow inserts for initial data setup
CREATE POLICY "Allow public insert to people" 
ON public.people FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public insert to memory_updates" 
ON public.memory_updates FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public insert to conversation_history" 
ON public.conversation_history FOR INSERT 
WITH CHECK (true);

-- Insert sample data for testing
INSERT INTO public.people (id, name, relationship, photo_url) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah', 'Daughter', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Michael', 'Son', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Dr. Emily Chen', 'Doctor', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200');

-- Insert sample memory updates
INSERT INTO public.memory_updates (person_id, text) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah visited last Sunday and brought homemade apple pie - your favorite recipe that she learned from you.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sarah lives in Portland with her husband Tom and two children, Emma and Jack.'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Michael calls every Wednesday evening at 7pm. He works as an architect in Seattle.'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Michael helped you plant the roses in the garden 5 years ago.'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Dr. Chen has been your primary care doctor for 8 years. She is very kind and patient.');

-- Insert sample conversation history
INSERT INTO public.conversation_history (person_id, transcript) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'You talked about the grandchildren''s school play and how proud you were of Emma''s performance.'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Michael mentioned he is planning a trip to visit next month for your birthday.');