-- ============================================
-- INDICES V2.0 Database Migration
-- Multi-Language, User Roles, Survey Assignment
-- ============================================

-- 1. USER PROFILES TABLE (with roles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'surveyor' CHECK (role IN ('admin', 'supervisor', 'surveyor')),
    is_active BOOLEAN DEFAULT true,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'mr')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can insert/update any profile
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. SURVEY ZONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    geometry JSONB, -- GeoJSON polygon defining the zone boundary
    color TEXT DEFAULT '#3B82F6', -- Zone color on map
    assigned_to UUID REFERENCES public.user_profiles(id),
    supervisor_id UUID REFERENCES public.user_profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    target_count INTEGER DEFAULT 0, -- Target number of surveys
    completed_count INTEGER DEFAULT 0, -- Completed surveys count
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on survey_zones
ALTER TABLE public.survey_zones ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view zones
CREATE POLICY "Users can view zones" ON public.survey_zones
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Admins and supervisors can manage zones
CREATE POLICY "Admins can manage zones" ON public.survey_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- 3. ADD ZONE REFERENCE TO SURVEYS TABLE
-- ============================================
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.survey_zones(id),
ADD COLUMN IF NOT EXISTS surveyor_id UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 4. UPDATE SURVEYS RLS POLICIES
-- ============================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;

-- New policies based on roles
-- Surveyors can view their own surveys and surveys in their assigned zones
CREATE POLICY "Surveyors can view assigned surveys" ON public.surveys
    FOR SELECT USING (
        auth.uid() = surveyor_id 
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
        )
        OR EXISTS (
            SELECT 1 FROM public.survey_zones 
            WHERE id = zone_id AND assigned_to = auth.uid()
        )
    );

-- Surveyors can insert surveys
CREATE POLICY "Authenticated users can insert surveys" ON public.surveys
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Surveyors can update their own surveys, admins/supervisors can update any
CREATE POLICY "Users can update surveys" ON public.surveys
    FOR UPDATE USING (
        auth.uid() = surveyor_id 
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    );

-- 5. FUNCTION TO AUTO-CREATE USER PROFILE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'surveyor'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. FUNCTION TO UPDATE ZONE COMPLETED COUNT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_zone_survey_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update completed count for the zone
    IF NEW.zone_id IS NOT NULL THEN
        UPDATE public.survey_zones
        SET completed_count = (
            SELECT COUNT(*) FROM public.surveys 
            WHERE zone_id = NEW.zone_id
        ),
        status = CASE 
            WHEN (SELECT COUNT(*) FROM public.surveys WHERE zone_id = NEW.zone_id) >= target_count 
            THEN 'completed' 
            ELSE 'in_progress' 
        END,
        updated_at = NOW()
        WHERE id = NEW.zone_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update zone count on survey insert
DROP TRIGGER IF EXISTS on_survey_created ON public.surveys;
CREATE TRIGGER on_survey_created
    AFTER INSERT ON public.surveys
    FOR EACH ROW EXECUTE FUNCTION public.update_zone_survey_count();

-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_surveys_zone_id ON public.surveys(zone_id);
CREATE INDEX IF NOT EXISTS idx_surveys_surveyor_id ON public.surveys(surveyor_id);
CREATE INDEX IF NOT EXISTS idx_surveys_review_status ON public.surveys(review_status);
CREATE INDEX IF NOT EXISTS idx_survey_zones_assigned_to ON public.survey_zones(assigned_to);
CREATE INDEX IF NOT EXISTS idx_survey_zones_status ON public.survey_zones(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 8. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.survey_zones TO authenticated;

-- ============================================
-- Run this migration in Supabase SQL Editor
-- ============================================
