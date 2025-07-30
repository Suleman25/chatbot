-- ============================================================================
-- DIRECT ALL USERS FIX
-- ============================================================================
-- This script creates a direct approach to get all users
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

-- Step 2: Create a view for all users (this will be easier to query)
CREATE OR REPLACE VIEW public.all_users_view AS
SELECT 
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

-- Step 3: Grant permissions on the view
GRANT SELECT ON public.all_users_view TO authenticated;

-- Step 4: Test the view
SELECT 
    'Testing view:' as info,
    COUNT(*) as total_users
FROM public.all_users_view;

-- Step 5: Show sample data from view
SELECT 
    'Sample data from view:' as info,
    user_id,
    display_name,
    email,
    is_admin,
    role,
    created_at
FROM public.all_users_view
LIMIT 10;

-- Step 6: Create a simple function that uses the view
CREATE OR REPLACE FUNCTION public.get_all_users_direct()
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
        auv.user_id,
        COALESCE(auv.display_name, 'Unknown User') as display_name,
        COALESCE(auv.email, 'user@example.com') as email,
        auv.created_at
    FROM public.all_users_view auv;
END;
$$;

-- Step 7: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_direct() TO authenticated;

-- Step 8: Test the function
SELECT 
    'Testing function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_direct();

-- Step 9: Show sample data from function
SELECT 
    'Sample data from function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_direct()
LIMIT 10;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel should show ALL users
-- ============================================================================ 