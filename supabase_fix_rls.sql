-- ============================================
-- FIX: Relax RLS policies for surveys table
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Surveyors can view assigned surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update surveys" ON public.surveys;

-- Create simple policies that allow authenticated users full access
-- (This matches the original behavior before V2)

-- Allow all authenticated users to view all surveys
CREATE POLICY "Allow authenticated select" ON public.surveys
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert surveys
CREATE POLICY "Allow authenticated insert" ON public.surveys
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update surveys
CREATE POLICY "Allow authenticated update" ON public.surveys
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete surveys
CREATE POLICY "Allow authenticated delete" ON public.surveys
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- Also ensure user_profiles policies are open
-- ============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;

-- Simple open policies for user_profiles
CREATE POLICY "Allow authenticated read profiles" ON public.user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update profiles" ON public.user_profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- Fix survey_zones policies
-- ============================================
DROP POLICY IF EXISTS "Users can view zones" ON public.survey_zones;
DROP POLICY IF EXISTS "Admins can manage zones" ON public.survey_zones;

CREATE POLICY "Allow authenticated read zones" ON public.survey_zones
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated manage zones" ON public.survey_zones
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- Done! Refresh your app and try again
-- ============================================
