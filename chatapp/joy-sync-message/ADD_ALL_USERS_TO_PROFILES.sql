-- ============================================================================
-- ADD ALL USERS TO PROFILES: Ensure All 4 Users Are Visible in Admin Panel
-- ============================================================================
-- Run this in Supabase SQL Editor to make all users visible in admin panel
-- ============================================================================

-- Step 1: Add email column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Ensure all auth users have profiles
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    au.email,
    au.created_at,
    CASE 
        WHEN au.email = 'sulemanjamil177@gmail.com' THEN true
        ELSE false
    END
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    is_admin = EXCLUDED.is_admin;

-- Step 3: Update existing profiles with correct emails
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND (profiles.email IS NULL OR profiles.email = '');

-- Step 4: Update admin status for specific users
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'sulemanjamil177@gmail.com'
);

-- Step 5: Show all users in profiles table
SELECT 
    'All users added to profiles' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.profiles;

-- Step 6: Show detailed user list
SELECT 
    user_id,
    display_name,
    email,
    is_admin,
    created_at
FROM public.profiles 
ORDER BY created_at DESC; 