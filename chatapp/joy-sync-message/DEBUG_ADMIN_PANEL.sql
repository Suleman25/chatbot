-- ============================================================================
-- DEBUG ADMIN PANEL
-- ============================================================================
-- This script will help us understand why admin panel isn't showing users
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check if profiles table exists and has data
SELECT 
    'Step 1: Profiles table check' as info,
    COUNT(*) as total_profiles
FROM public.profiles;

-- Step 2: Show all profiles
SELECT 
    'Step 2: All profiles' as info,
    user_id,
    display_name,
    is_admin,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Step 3: Check if auth.users table has data
SELECT 
    'Step 3: Auth users check' as info,
    COUNT(*) as total_auth_users
FROM auth.users;

-- Step 4: Show auth users
SELECT 
    'Step 4: Auth users' as info,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- Step 5: Join profiles and auth.users
SELECT 
    'Step 5: Joined data' as info,
    p.user_id,
    p.display_name,
    u.email,
    p.is_admin,
    p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Step 6: Check RLS policies
SELECT 
    'Step 6: RLS policies' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 7: Test simple query (what admin panel will use)
SELECT 
    'Step 7: Simple query test' as info,
    user_id,
    display_name,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================================================
-- RESULTS ANALYSIS:
-- ============================================================================
-- 1. If Step 1 shows 0 profiles: No users in database
-- 2. If Step 1 shows profiles but admin panel doesn't: RLS issue
-- 3. If Step 7 works but admin panel doesn't: Code issue
-- ============================================================================ 