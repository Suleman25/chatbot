-- ============================================================================
-- TEST ADMIN PANEL USERS
-- ============================================================================
-- This script tests if all users are accessible for the admin panel
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Test 1: Check if the view exists and has data
SELECT 
    'Testing all_users_view:' as test,
    COUNT(*) as total_users
FROM public.all_users_view;

-- Test 2: Show all users from the view
SELECT 
    'All users from view:' as info,
    user_id,
    display_name,
    email,
    is_admin,
    role,
    created_at
FROM public.all_users_view
ORDER BY created_at DESC;

-- Test 3: Test the function
SELECT 
    'Testing get_all_users_direct function:' as test,
    COUNT(*) as users_returned
FROM public.get_all_users_direct();

-- Test 4: Show sample data from function
SELECT 
    'Sample data from function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_direct()
LIMIT 5;

-- Test 5: Check if we can query profiles directly
SELECT 
    'Direct profiles query:' as test,
    COUNT(*) as total_profiles
FROM public.profiles;

-- Test 6: Show all profiles
SELECT 
    'All profiles:' as info,
    user_id,
    display_name,
    is_admin,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 1. Test 1 should show > 0 users
-- 2. Test 2 should show all users with emails
-- 3. Test 3 should show > 0 users
-- 4. Test 4 should show sample user data
-- 5. Test 5 should show > 0 profiles
-- 6. Test 6 should show all profiles
-- ============================================================================ 