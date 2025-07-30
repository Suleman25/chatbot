-- ============================================================================
-- ADMIN PANEL FIX - Show All Users
-- ============================================================================
-- This script fixes the admin panel to show all users from the database
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Ensure profiles table has all necessary columns
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Add is_admin column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 3: Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Step 4: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create permissive policies for admin panel
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" 
ON public.user_roles FOR SELECT 
USING (true);

-- Step 6: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;

-- Step 7: Create profiles for all existing auth users
INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
SELECT 
    id as user_id,
    COALESCE(
        raw_user_meta_data->>'display_name',
        raw_user_meta_data->>'name',
        split_part(email, '@', 1),
        'User'
    ) as display_name,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users 
ON CONFLICT (user_id) 
DO UPDATE SET
    display_name = COALESCE(
        EXCLUDED.display_name,
        profiles.display_name,
        'User'
    ),
    updated_at = NOW();

-- Step 8: Create user roles for all users (default to 'user')
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    id as user_id,
    'user' as role,
    NOW() as created_at
FROM auth.users 
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 9: Make sulemanjamil177@gmail.com admin
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'sulemanjamil177@gmail.com'
);

INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    id as user_id,
    'admin' as role,
    NOW() as created_at
FROM auth.users 
WHERE email = 'sulemanjamil177@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 10: Create a function to get all users for admin panel
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        u.email,
        p.display_name,
        p.avatar_url,
        p.is_admin,
        COALESCE(ur.role, 'user') as role,
        p.created_at
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
    LEFT JOIN auth.users u ON p.user_id = u.id
    ORDER BY p.created_at DESC;
END;
$$;

-- Step 11: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

-- SQL function to return all users with their real email for the admin panel
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin_panel()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(p.display_name, 'Unknown User') as display_name,
    COALESCE(u.email::TEXT, 'user@example.com') as email,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.user_id = u.id
  ORDER BY p.created_at DESC
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin_panel() TO authenticated;

-- Step 12: Verify the setup
SELECT 
    'Setup complete!' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_profiles
FROM public.profiles;

SELECT 
    'User roles:' as info,
    COUNT(*) as total_roles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_roles,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as user_roles
FROM public.user_roles;

-- Step 13: Show all users in the system
SELECT 
    'All users in system:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role,
    p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
ORDER BY p.created_at DESC;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel should show all users
-- ============================================================================ 