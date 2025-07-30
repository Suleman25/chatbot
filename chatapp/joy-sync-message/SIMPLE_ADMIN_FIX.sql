-- ============================================================================
-- SIMPLE ADMIN FIX: Quick Fix for Admin Panel
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the admin panel immediately
-- ============================================================================

-- Step 1: Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Update all profiles with emails from auth.users
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.user_id = auth.users.id;

-- Step 3: Ensure all auth users have profiles
INSERT INTO public.profiles (user_id, display_name, email, created_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Step 4: Make sure admin users exist
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('sulemanjamil177@gmail.com', 'sam@example.com')
);

-- Step 5: Create simple RLS policy for admin access
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT USING (true);

-- Step 6: Grant all permissions
GRANT ALL ON public.profiles TO authenticated;

-- Step 7: Show results
SELECT 
    'Simple fix complete' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.profiles; 