-- ============================================================================
-- ENSURE ADMIN ACCESS
-- ============================================================================
-- This script ensures the admin user has proper access
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Make sure the user is admin
SELECT * FROM public.assign_admin_role('sulemanjamil177@gmail.com');

-- Step 2: Verify admin status
SELECT 
    'Admin verification:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id IN (
    SELECT id FROM auth.users WHERE email = 'sulemanjamil177@gmail.com'
);

-- Step 3: Show all users in the system
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

-- Step 4: Check if user_roles table has data
SELECT 
    'User roles table:' as info,
    COUNT(*) as total_roles,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_roles,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as user_roles
FROM public.user_roles;

-- Step 5: Check if profiles table has data
SELECT 
    'Profiles table:' as info,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_profiles
FROM public.profiles;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel should work correctly
-- ============================================================================ 