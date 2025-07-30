-- ============================================================================
-- TEST ADMIN PANEL - Verify All Users Are Visible
-- ============================================================================
-- This script tests if the admin panel will show all users
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Test 1: Check if the function exists and works
SELECT 
    'Testing get_all_users_for_admin function:' as test,
    COUNT(*) as total_users_returned
FROM public.get_all_users_for_admin();

-- Test 2: Show all users that should be visible
SELECT 
    'All users that should be visible in admin panel:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role,
    p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
ORDER BY p.created_at DESC;

-- Test 3: Check if admin user exists
SELECT 
    'Admin user check:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.is_admin = TRUE OR ur.role = 'admin';

-- Test 4: Count total users in system
SELECT 
    'User counts:' as info,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_profiles,
    COUNT(CASE WHEN is_admin = FALSE THEN 1 END) as regular_profiles
FROM public.profiles;

-- Test 5: Check user roles
SELECT 
    'Role distribution:' as info,
    role,
    COUNT(*) as count
FROM public.user_roles
GROUP BY role
ORDER BY role;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 1. Test 1 should show > 0 users
-- 2. Test 2 should show all users in your system
-- 3. Test 3 should show sulemanjamil177@gmail.com as admin
-- 4. Test 4 should show total user count
-- 5. Test 5 should show role distribution
-- ============================================================================ 