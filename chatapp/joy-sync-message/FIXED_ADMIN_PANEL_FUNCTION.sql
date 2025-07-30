-- ============================================================================
-- FIXED ADMIN PANEL FUNCTION
-- ============================================================================
-- This script fixes the data type mismatch error
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop the problematic function first
DROP FUNCTION IF EXISTS public.get_all_users_for_admin_panel();

-- Step 2: Create the fixed function with proper data types
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
        COALESCE(u.email::TEXT, 'user@example.com') as email,
        p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    ORDER BY p.created_at DESC;
END;
$$;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin_panel() TO authenticated;

-- Step 4: Test the function
SELECT 
    'Testing fixed function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_for_admin_panel();

-- Step 5: Show sample data from function
SELECT 
    'Sample data from fixed function:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_for_admin_panel()
LIMIT 10;

-- Step 6: Show all users in database
SELECT 
    'All users in database:' as info,
    p.user_id,
    p.display_name,
    u.email,
    p.is_admin,
    p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- The function should now work without errors
-- ============================================================================ 