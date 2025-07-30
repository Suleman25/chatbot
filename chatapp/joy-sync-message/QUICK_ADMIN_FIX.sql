-- ============================================================================
-- QUICK ADMIN FIX: Add Email Column to Profiles Table
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the admin panel
-- ============================================================================

-- Step 1: Add email column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
    ELSE
        RAISE NOTICE 'Email column already exists in profiles table';
    END IF;
END $$;

-- Step 2: Update profiles with email from auth.users
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND profiles.email IS NULL;

-- Step 3: Ensure all users have profiles
INSERT INTO public.profiles (user_id, display_name, email, created_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Step 4: Update existing profiles with missing emails
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND (profiles.email IS NULL OR profiles.email = '');

-- Step 5: Create a simple function to get all users for admin
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.display_name,
        COALESCE(p.email, 'No email available') as email,
        p.created_at,
        p.is_admin
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- Step 7: Update RLS policies to allow admin access
DROP POLICY IF EXISTS "admin_profiles_select_policy" ON public.profiles;
CREATE POLICY "admin_profiles_select_policy" ON public.profiles 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

-- Step 8: Final verification
SELECT 
    'Quick fix complete' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.profiles; 