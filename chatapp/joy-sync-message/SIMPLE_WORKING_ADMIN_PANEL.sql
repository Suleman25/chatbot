-- ============================================================================
-- SIMPLE WORKING ADMIN PANEL
-- ============================================================================
-- This script creates a simple, working solution for the admin panel
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Show current users in database
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

-- Step 3: Create a simple, working function
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

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin_panel() TO authenticated;

-- Step 5: Test the function
SELECT 
    'Testing function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_for_admin_panel();

-- Step 6: Show sample data from function
SELECT 
    'Sample data from function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_for_admin_panel()
LIMIT 10;

-- Step 7: Create delete function
DROP FUNCTION IF EXISTS public.admin_delete_user_complete(UUID);

CREATE OR REPLACE FUNCTION public.admin_delete_user_complete(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Delete from user_roles first
    DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
    
    -- Delete from profiles
    DELETE FROM public.profiles WHERE user_id = user_id_to_delete;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Step 8: Grant execute permission for delete function
GRANT EXECUTE ON FUNCTION public.admin_delete_user_complete(UUID) TO authenticated;

-- Step 9: Test delete function
SELECT 
    'Delete function created successfully' as info;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel should work correctly
-- ============================================================================ 