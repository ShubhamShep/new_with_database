-- ================================================
-- COMPREHENSIVE RLS POLICIES FIX
-- Run this in Supabase SQL Editor
-- ================================================

-- First, re-enable RLS on all tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- DROP ALL EXISTING POLICIES (to start fresh)
-- ================================================

-- Drop existing policies on surveys
DROP POLICY IF EXISTS "Users can view all surveys" ON surveys;
DROP POLICY IF EXISTS "Users can insert surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON surveys;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON surveys;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON surveys;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON surveys;

-- Drop existing policies on survey_zones
DROP POLICY IF EXISTS "Users can view assigned zones" ON survey_zones;
DROP POLICY IF EXISTS "Admins can view all zones" ON survey_zones;
DROP POLICY IF EXISTS "Admins can manage zones" ON survey_zones;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON survey_zones;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON survey_zones;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON survey_zones;

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- ================================================
-- CREATE SIMPLE, PERMISSIVE POLICIES
-- ================================================

-- SURVEYS TABLE - Allow all authenticated users full access
CREATE POLICY "Allow authenticated users to read all surveys"
ON surveys FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert surveys"
ON surveys FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update surveys"
ON surveys FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete surveys"
ON surveys FOR DELETE
TO authenticated
USING (true);

-- SURVEY_ZONES TABLE - Allow all authenticated users full access
CREATE POLICY "Allow authenticated users to read all zones"
ON survey_zones FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert zones"
ON survey_zones FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update zones"
ON survey_zones FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete zones"
ON survey_zones FOR DELETE
TO authenticated
USING (true);

-- PROFILES TABLE - Allow all authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ================================================
-- VERIFY POLICIES ARE APPLIED
-- ================================================

-- Check surveys policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'surveys';

-- Check survey_zones policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'survey_zones';

-- Check profiles policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
