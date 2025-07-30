-- ============================================================================
-- QUICK ADMIN TEST - Verify Database Setup
-- ============================================================================
-- Run this to check if everything is working
-- ============================================================================

-- Test 1: Check if profiles table has users
SELECT 
    'Profiles table:' as info,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_profiles
FROM public.profiles;

-- Test 2: Check if user_roles table has data
SELECT 
    'User roles table:' as info,
    COUNT(*) as total_roles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_roles
FROM public.user_roles;

-- Test 3: Show all users with their roles
SELECT 
    'All users with roles:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role,
    p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
ORDER BY p.created_at DESC;

-- Test 4: Check specific admin user
SELECT 
    'Admin user check:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.is_admin = TRUE OR ur.role = 'admin';

-- Test 5: Test the admin function
SELECT 
    'Admin function test:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_for_admin();

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 1. Test 1 should show > 0 profiles
-- 2. Test 2 should show > 0 roles
-- 3. Test 3 should show all users
-- 4. Test 4 should show admin user
-- 5. Test 5 should show > 0 users
-- ============================================================================ 