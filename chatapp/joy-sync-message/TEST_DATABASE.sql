-- ============================================================================
-- TEST DATABASE CONNECTIVITY AND FIX PROFILES
-- ============================================================================
-- Run this in Supabase SQL Editor to test and fix database issues
-- ============================================================================

-- Step 1: Check if profiles table exists
SELECT 'Testing profiles table...' as step;

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_admin BOOLEAN DEFAULT false
);

-- Step 3: Add email column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 4: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create basic RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
CREATE POLICY "Enable update for users based on user_id" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 6: Create profiles for known users
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin)
VALUES
  ('6cc043e9-a56c-40a2-9504-46265dc7f36b', 'Jack', 'vopoh47826@kloudis.com', NOW(), false),
  ('4c296628-ed91-47c2-96db-14640269f17d', 'Marium', 'mariummansoori18@gmail.com', NOW(), false),
  ('033314da-63a8-4789-ab4d-8b1f51659342', 'suleman', 'sulemanjamil05@gmail.com', NOW(), false),
  ('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'sam', 'sulemanjamil177@gmail.com', NOW(), true),
  ('46febed0-a336-4b02-8d60-0c270ff44943', 'Tom', 'xarodeh233@coursora.com', NOW(), false)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  is_admin = EXCLUDED.is_admin;

-- Step 7: Grant permissions
GRANT ALL ON public.profiles TO authenticated;

-- Step 8: Test the setup
SELECT '=== TEST RESULTS ===' as step;
SELECT 'Profiles table exists:' as test, COUNT(*) as result FROM information_schema.tables WHERE table_name = 'profiles';
SELECT 'Profiles count:' as test, COUNT(*) as result FROM public.profiles;
SELECT 'All profiles:' as test;
SELECT user_id, display_name, email, is_admin FROM public.profiles ORDER BY created_at DESC;

-- Step 9: Success message
SELECT '✅ Database test completed successfully!' as result; 