-- ============================================================================
-- ADMIN ROLE FIX FOR sulemanjamil177@gmail.com
-- ============================================================================
-- Run this in Supabase SQL Editor to fix admin access
-- ============================================================================

-- Step 1: Find the user in auth.users table
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users 
WHERE email = 'sulemanjamil177@gmail.com';

-- Step 2: Ensure user_roles table exists with correct schema
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for user_roles
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" 
ON public.user_roles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_insert_policy" 
ON public.user_roles FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() = granted_by);

DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
CREATE POLICY "user_roles_update_policy" 
ON public.user_roles FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = granted_by);

-- Step 5: Grant permissions
GRANT ALL ON public.user_roles TO authenticated;

-- Step 6: Insert admin role for the specific user
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT 
    id as user_id,
    'admin' as role,
    NOW() as granted_at
FROM auth.users 
WHERE email = 'sulemanjamil177@gmail.com'
ON CONFLICT (user_id, role) 
DO UPDATE SET 
    role = 'admin',
    granted_at = NOW();

-- Step 7: Ensure profiles table exists and user has a profile
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 8: Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 9: Create profiles RLS policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Step 10: Grant permissions on profiles
GRANT ALL ON public.profiles TO authenticated;

-- Step 11: Create profile for the user if it doesn't exist
INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
SELECT 
    id as user_id,
    'sulemanjamil177' as display_name,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users 
WHERE email = 'sulemanjamil177@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    display_name = 'sulemanjamil177',
    updated_at = NOW();

-- Step 12: Verify the admin role was set correctly
SELECT 
    p.user_id,
    p.display_name,
    ur.role,
    ur.granted_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id IN (
    SELECT id FROM auth.users WHERE email = 'sulemanjamil177@gmail.com'
);

-- Step 13: Show all admin users
SELECT 
    p.user_id,
    p.display_name,
    ur.role,
    ur.granted_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.granted_at DESC;

-- ============================================================================
-- ADMIN ROLE FIX COMPLETE! 🎉
-- ============================================================================
-- The user sulemanjamil177@gmail.com should now have admin access
-- ============================================================================ 