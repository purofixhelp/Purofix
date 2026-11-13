-- Purofix RO Service - Supabase Database Schema
-- Project: purofix-lucknow (ref: fhyhktccdhhxpwmpkzqh)

-- 1. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service_type TEXT DEFAULT 'RO Repair / Service',
    issue TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    address TEXT DEFAULT '',
    preferred_time TEXT DEFAULT 'Within 30 Mins',
    tds_reading TEXT DEFAULT '',
    status TEXT DEFAULT 'New',
    source TEXT DEFAULT 'Website Booking',
    notes TEXT DEFAULT '',
    assigned_to TEXT DEFAULT 'Ashwani Tiwari',
    price TEXT DEFAULT '₹199 Inspection'
);

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    author TEXT NOT NULL,
    rating INTEGER DEFAULT 5 NOT NULL,
    locality TEXT DEFAULT 'Lucknow',
    review_text TEXT NOT NULL,
    service_used TEXT DEFAULT 'RO Service',
    verified BOOLEAN DEFAULT true,
    source TEXT DEFAULT 'Customer Review'
);

-- 3. Create settings table for enterprise sync
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow anon read leads" ON public.leads;
DROP POLICY IF EXISTS "Allow anon insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow anon update leads" ON public.leads;

DROP POLICY IF EXISTS "Allow anon read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow anon insert reviews" ON public.reviews;

DROP POLICY IF EXISTS "Allow anon read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow anon upsert settings" ON public.settings;

-- Create Policies for leads
CREATE POLICY "Allow anon read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow anon insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update leads" ON public.leads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete leads" ON public.leads FOR DELETE USING (true);

-- Create Policies for reviews
CREATE POLICY "Allow anon read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow anon insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon delete reviews" ON public.reviews FOR DELETE USING (true);

-- Create Policies for settings
CREATE POLICY "Allow anon read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow anon upsert settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete settings" ON public.settings FOR DELETE USING (true);

-- Enable Realtime for leads and reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
