-- ============================================================================
-- FINAL ADMIN ROLE FIX
-- ============================================================================
-- Complete fix to make sulemanjamil177@gmail.com an admin
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop existing user_roles table if it exists (to recreate with correct constraints)
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Step 2: Create user_roles table with proper constraints
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Step 3: Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_insert_policy" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
CREATE POLICY "user_roles_update_policy" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id);

-- Step 5: Grant permissions
GRANT ALL ON public.user_roles TO authenticated;

-- Step 6: Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 7: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 9: Grant permissions on profiles
GRANT ALL ON public.profiles TO authenticated;

-- Step 10: Create profile for the user if it doesn't exist
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

-- Step 11: Make the user an admin
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    id as user_id,
    'admin' as role,
    NOW() as created_at
FROM auth.users 
WHERE email = 'sulemanjamil177@gmail.com';

-- Step 12: Verify the admin role was set correctly
SELECT 
    'Admin role set successfully!' as status,
    p.user_id,
    p.display_name,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id IN (
    SELECT id FROM auth.users WHERE email = 'sulemanjamil177@gmail.com'
);

-- Step 13: Show all admin users
SELECT 
    'All admin users:' as info,
    p.display_name,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================ 