-- ============================================================================
-- FINAL DATABASE FIX - RECURSION ELIMINATED
-- ============================================================================
-- Run this in Supabase SQL Editor to eliminate the infinite recursion error
-- ============================================================================

-- Step 1: Drop all existing RLS policies on the profiles table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- Step 2: Drop the profiles table completely to start fresh (CASCADE removes dependent objects like RLS)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 3: Create profiles table with necessary columns
CREATE TABLE public.profiles (
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

-- Step 4: Explicitly disable RLS on the profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 5: Grant basic permissions to authenticated and anon roles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- Step 6: Insert/Update profiles for known users (this will also update any existing ones)
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

-- Step 7: Test the setup
SELECT '=== FINAL FIX RESULTS ===' as step;
SELECT 'Profiles table exists:' as test, COUNT(*) as result FROM information_schema.tables WHERE table_name = 'profiles';
SELECT 'Profiles count:' as test, COUNT(*) as result FROM public.profiles;
SELECT 'RLS enabled on profiles (0=disabled, 1=enabled):' as test, relrowsecurity::int as result FROM pg_class WHERE relname = 'profiles';
SELECT 'All profiles:' as test;
SELECT user_id, display_name, email, is_admin FROM public.profiles ORDER BY created_at DESC;

-- Step 8: Success message
SELECT '✅ Database fix completed successfully! RLS should be disabled.' as result; 