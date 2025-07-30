-- ============================================================================
-- QUICK TEST ALL USERS
-- ============================================================================
-- This script tests and fixes the admin panel to show ALL users
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check current users in database
SELECT 
    'Current users in database:' as info,
    COUNT(*) as total_users
FROM public.profiles;

-- Step 2: Show all users with details
SELECT 
    'All users with details:' as info,
    p.user_id,
    p.display_name,
    u.email,
    p.is_admin,
    p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Step 3: Test the function
SELECT 
    'Testing function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_for_admin_panel();

-- Step 4: Show sample data from function
SELECT 
    'Sample data from function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_for_admin_panel()
LIMIT 10;

-- Step 5: If function doesn't work, recreate it
DROP FUNCTION IF EXISTS public.get_all_users_for_admin_panel();

CREATE OR REPLACE FUNCTION public.get_all_users_for_admin_panel()
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

-- Step 6: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin_panel() TO authenticated;

-- Step 7: Test the recreated function
SELECT 
    'Testing recreated function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_for_admin_panel();

-- Step 8: Show final data
SELECT 
    'Final data from function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_for_admin_panel()
ORDER BY created_at DESC;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now check the admin panel - it should show ALL users
-- ============================================================================ 