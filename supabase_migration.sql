-- Enhanced Survey Schema Migration - COMPLETE VERSION
-- This includes all previous migrations plus multi-floor support

-- 1. Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'surveyor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill existing users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'surveyor'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Add all required columns to surveys table (including comprehensive Annexure-A fields)

-- Basic Fields (existing)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS owner_name text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS aadhaar_number text,
ADD COLUMN IF NOT EXISTS property_usage text,
ADD COLUMN IF NOT EXISTS construction_type text,
ADD COLUMN IF NOT EXISTS ownership_type text CHECK (ownership_type IN ('owned', 'rented', 'leased', 'government')),
ADD COLUMN IF NOT EXISTS year_of_construction integer,
ADD COLUMN IF NOT EXISTS water_connection boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS electricity_connection boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS area_sqm numeric,
ADD COLUMN IF NOT EXISTS owner_photo_url text,
ADD COLUMN IF NOT EXISTS building_photo_url text;

-- Additional Owner Details (Annexure-A Section 1)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS email_address text,
ADD COLUMN IF NOT EXISTS family_members_count integer,
ADD COLUMN IF NOT EXISTS occupier_name text;

-- Location Details (Annexure-A Section 2)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS survey_gat_no text,
ADD COLUMN IF NOT EXISTS city_survey_no text,
ADD COLUMN IF NOT EXISTS layout_name_plot_no text,
ADD COLUMN IF NOT EXISTS building_name text,
ADD COLUMN IF NOT EXISTS address_with_floor text,
ADD COLUMN IF NOT EXISTS nearest_road_type text,
ADD COLUMN IF NOT EXISTS pin_code text,
ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'Residential',
ADD COLUMN IF NOT EXISTS usage_type text,
ADD COLUMN IF NOT EXISTS usage_sub_type text;

-- Construction Details (Annexure-A Section 3)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS building_permission boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS permission_no text,
ADD COLUMN IF NOT EXISTS permission_date date,
ADD COLUMN IF NOT EXISTS occupancy_certificate boolean DEFAULT false;

-- Water Supply Details (Annexure-A Section 4)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS water_connection_type text,
ADD COLUMN IF NOT EXISTS water_authorized text,
ADD COLUMN IF NOT EXISTS water_meter_no text,
ADD COLUMN IF NOT EXISTS water_consumer_no text,
ADD COLUMN IF NOT EXISTS water_connection_date date,
ADD COLUMN IF NOT EXISTS pipe_size text;

-- Sanitation & Utilities (Annexure-A Section 5)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS has_toilet boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS toilet_count integer,
ADD COLUMN IF NOT EXISTS has_septic_tank boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_sewerage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_solar boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_rainwater_harvesting boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_paid boolean DEFAULT false;

-- Assessment Details (Annexure-A Section 6)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS ulb_name text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS town text,
ADD COLUMN IF NOT EXISTS zone_no text,
ADD COLUMN IF NOT EXISTS new_ward_no text,
ADD COLUMN IF NOT EXISTS old_ward_no text,
ADD COLUMN IF NOT EXISTS old_property_no text,
ADD COLUMN IF NOT EXISTS new_property_no text,
ADD COLUMN IF NOT EXISTS total_carpet_area numeric,
ADD COLUMN IF NOT EXISTS exempted_area numeric,
ADD COLUMN IF NOT EXISTS assessable_area numeric,
ADD COLUMN IF NOT EXISTS current_tax_details text;

-- Photos (Annexure-A Section 7)
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS building_photo_url_2 text; -- Second building photo

-- 5. Add multi-floor support columns
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS floor_number integer,
ADD COLUMN IF NOT EXISTS total_floors integer,
ADD COLUMN IF NOT EXISTS unit_identifier text; -- e.g., "Floor 1", "Flat A"

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_surveys_building_id_floor 
ON public.surveys(building_id, floor_number);

CREATE INDEX IF NOT EXISTS idx_surveys_property_type 
ON public.surveys(property_type);

CREATE INDEX IF NOT EXISTS idx_surveys_district_town 
ON public.surveys(district, town);

CREATE INDEX IF NOT EXISTS idx_surveys_ward_zone 
ON public.surveys(zone_no, new_ward_no);

CREATE INDEX IF NOT EXISTS idx_surveys_tax_paid 
ON public.surveys(tax_paid);

CREATE INDEX IF NOT EXISTS idx_surveys_created_at 
ON public.surveys(created_at);

