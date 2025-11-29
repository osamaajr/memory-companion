-- Add external_id column to people table
ALTER TABLE public.people ADD COLUMN external_id text;

-- Create index for faster lookups
CREATE INDEX idx_people_external_id ON public.people(external_id);