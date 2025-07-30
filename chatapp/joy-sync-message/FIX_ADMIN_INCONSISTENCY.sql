-- ============================================================================
-- FIX ADMIN INCONSISTENCY
-- ============================================================================
-- This script fixes the inconsistency between profiles.is_admin and user_roles.role
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Update profiles table to set is_admin = TRUE for users with admin role
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'
);

-- Step 2: Verify the fix
SELECT 
    'After fix - Admin users:' as info,
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.is_admin = TRUE OR ur.role = 'admin';

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

-- Step 4: Count total users
SELECT 
    'User counts:' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN p.is_admin = TRUE OR ur.role = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN p.is_admin = FALSE AND (ur.role IS NULL OR ur.role = 'user') THEN 1 END) as regular_users
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel should work correctly
-- ============================================================================ 