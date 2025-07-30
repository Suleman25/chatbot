-- ============================================================================
-- CREATE USER EMAIL FUNCTION
-- ============================================================================
-- This script creates a function to get all users with their emails
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create function to get all users with emails
CREATE OR REPLACE FUNCTION public.get_all_users_with_emails()
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
        p.display_name,
        u.email,
        p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_with_emails() TO authenticated;

-- Test the function
SELECT 
    'Testing function:' as info,
    COUNT(*) as users_returned
FROM public.get_all_users_with_emails();

-- Show sample data
SELECT 
    'Sample data:' as info,
    user_id,
    display_name,
    email,
    created_at
FROM public.get_all_users_with_emails()
LIMIT 5;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel can get real email addresses
-- ============================================================================ 