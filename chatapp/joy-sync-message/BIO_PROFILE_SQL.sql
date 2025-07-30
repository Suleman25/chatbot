-- ============================================================================
-- BIO PROFILE UPDATE: ADD BIO FIELD TO PROFILES
-- ============================================================================
-- This adds bio functionality to user profiles like WhatsApp
-- Run this in Supabase SQL Editor to enable bio feature
-- ============================================================================

-- Step 1: Add bio column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Step 2: Add constraint for bio length (max 160 characters like WhatsApp)
ALTER TABLE public.profiles 
ADD CONSTRAINT check_bio_length CHECK (bio IS NULL OR length(bio) <= 160);

-- Step 3: Update existing profiles to have empty bio
UPDATE public.profiles 
SET bio = NULL 
WHERE bio IS NOT DEFINED;

-- Step 4: Add index for bio field for search functionality (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_bio ON public.profiles(bio) WHERE bio IS NOT NULL;

-- Step 5: Update RLS policies to include bio field
-- The existing policies should already cover bio since they allow all profile updates
-- but let's make sure they're properly set

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Recreate policies with bio support
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT 
USING (true); -- Anyone can view profiles (including bio)

CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Grant necessary permissions (should already exist but let's be sure)
GRANT ALL ON public.profiles TO authenticated;

-- ============================================================================
-- BIO FEATURE ENABLED! 📝✨
-- ============================================================================
-- After running this SQL:
-- 1. Refresh your app (F5)
-- 2. Go to Profile Settings (/settings)
-- 3. Add your bio in the Bio field (max 160 characters)
-- 4. Your bio will be visible to other users like WhatsApp
-- ============================================================================ 