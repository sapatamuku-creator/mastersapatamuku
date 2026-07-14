-- setup_sortir_schema.sql
-- Run this script in the Supabase SQL Editor to set up the database tables and RLS policies.

-- 1. Create public.sortir_events table
CREATE TABLE IF NOT EXISTS public.sortir_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(150) NOT NULL,
    event_slug VARCHAR(100) UNIQUE NOT NULL,
    quota_limit INTEGER DEFAULT 50 NOT NULL,
    drive_folder_url TEXT NOT NULL,
    drive_folder_id VARCHAR(100) NOT NULL,
    whatsapp_admin VARCHAR(20) NOT NULL, -- Photographer's whatsapp number
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for event slugs
CREATE INDEX IF NOT EXISTS idx_sortir_events_slug ON public.sortir_events(event_slug);

-- 2. Create public.sortir_selections table
CREATE TABLE IF NOT EXISTS public.sortir_selections (
    event_id UUID REFERENCES public.sortir_events(id) ON DELETE CASCADE NOT NULL,
    photo_id VARCHAR(255) NOT NULL,
    photo_name VARCHAR(255) NOT NULL,
    is_selected BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, photo_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.sortir_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_selections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for sortir_events
CREATE POLICY "Allow public insert for events" 
    ON public.sortir_events FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public select for events" 
    ON public.sortir_events FOR SELECT 
    USING (true);

CREATE POLICY "Allow public update for events" 
    ON public.sortir_events FOR UPDATE 
    USING (true);

-- 5. RLS Policies for sortir_selections
CREATE POLICY "Allow public select for selections" 
    ON public.sortir_selections FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert for selections" 
    ON public.sortir_selections FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update for selections" 
    ON public.sortir_selections FOR UPDATE 
    USING (true);

CREATE POLICY "Allow public delete for selections" 
    ON public.sortir_selections FOR DELETE 
    USING (true);

