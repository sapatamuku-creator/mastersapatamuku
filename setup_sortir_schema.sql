-- setup_sortir_schema.sql
-- Run this script in the Supabase SQL Editor to set up the database tables and RLS policies.

-- 1. Create public.sortir_vendors table
CREATE TABLE IF NOT EXISTS public.sortir_vendors (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(150) NOT NULL,
    whatsapp_admin VARCHAR(20) NOT NULL,
    email_recovery VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly' NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    referred_by VARCHAR(50) REFERENCES public.sortir_vendors(username) ON DELETE SET NULL,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    active_session_token UUID, -- Silently check for concurrent login sessions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create public.sortir_events table
CREATE TABLE IF NOT EXISTS public.sortir_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE CASCADE NOT NULL,
    event_name VARCHAR(150) NOT NULL,
    event_slug VARCHAR(100) UNIQUE NOT NULL,
    quota_limit INTEGER DEFAULT 50 NOT NULL,
    drive_folder_url TEXT NOT NULL,
    drive_folder_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for event slugs
CREATE INDEX IF NOT EXISTS idx_sortir_events_slug ON public.sortir_events(event_slug);

-- 3. Create public.sortir_selections table
CREATE TABLE IF NOT EXISTS public.sortir_selections (
    event_id UUID REFERENCES public.sortir_events(id) ON DELETE CASCADE NOT NULL,
    photo_id VARCHAR(255) NOT NULL,
    photo_name VARCHAR(255) NOT NULL,
    is_selected BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, photo_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.sortir_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_selections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for sortir_vendors
CREATE POLICY "Vendors can read own profile" 
    ON public.sortir_vendors FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Vendors can update own profile" 
    ON public.sortir_vendors FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow authenticated inserts for profile creation" 
    ON public.sortir_vendors FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 6. RLS Policies for sortir_events
CREATE POLICY "Anyone can view event by slug" 
    ON public.sortir_events FOR SELECT 
    USING (true);

CREATE POLICY "Vendors can manage own events" 
    ON public.sortir_events FOR ALL 
    USING (auth.uid() = vendor_id);

-- 7. RLS Policies for sortir_selections
CREATE POLICY "Anyone can read selections" 
    ON public.sortir_selections FOR SELECT 
    USING (true);

CREATE POLICY "Anyone can upsert selections" 
    ON public.sortir_selections FOR ALL 
    USING (true);

-- 8. Stored Procedure to Validate Referral Code
CREATE OR REPLACE FUNCTION check_active_referral(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sortir_vendors
        WHERE username = p_username AND is_active = true
    );
END;
$$;

-- 9. Stored Procedure to Check Username Availability
CREATE OR REPLACE FUNCTION check_username_exists(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sortir_vendors
        WHERE username = p_username
    );
END;
$$;
