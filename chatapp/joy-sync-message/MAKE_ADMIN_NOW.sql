-- ============================================================================
-- MAKE USER ADMIN NOW
-- ============================================================================
-- Simple script to make sulemanjamil177@gmail.com an admin
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Make the user admin
SELECT * FROM public.assign_admin_role('sulemanjamil177@gmail.com');

-- Step 2: Verify the admin role was set correctly
SELECT 
    'Admin assignment complete!' as status,
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

-- Step 3: Show all admin users
SELECT 
    'All admin users:' as info,
    p.display_name,
    p.is_admin,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now sulemanjamil177@gmail.com is admin with crown icon
-- ============================================================================ 