-- ============================================================================
-- SIMPLE ALL USERS FIX
-- ============================================================================
-- This script ensures all users are visible in admin panel
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Show all users in the system
SELECT 
    'All users in system:' as info,
    p.user_id,
    p.display_name,
    u.email,
    p.is_admin,
    ur.role,
    p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
ORDER BY p.created_at DESC;

-- Step 2: Count total users
SELECT 
    'User counts:' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN p.is_admin = TRUE OR ur.role = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN p.is_admin = FALSE AND (ur.role IS NULL OR ur.role = 'user') THEN 1 END) as regular_users
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id;

-- Step 3: Create a simple function to get all users
CREATE OR REPLACE FUNCTION public.get_all_users_simple()
RETURNS TABLE(
    user_id UUID,
    display_name TEXT,
    email TEXT,
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
        COALESCE(p.display_name, 'Unknown User') as display_name,
        COALESCE(u.email, 'user@example.com') as email,
        p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    ORDER BY p.created_at DESC;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_simple() TO authenticated;

-- Step 5: Test the function
SELECT 
    'Testing simple function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_simple();

-- Step 6: Show sample data from function
SELECT 
    'Sample data from function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_simple()
LIMIT 10;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel should show all users
-- ============================================================================ 