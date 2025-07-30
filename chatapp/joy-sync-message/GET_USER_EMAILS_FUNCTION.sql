-- Function to get user emails from auth.users table
-- This function will be called via RPC to get real user emails

CREATE OR REPLACE FUNCTION get_user_emails()
RETURNS TABLE (
    user_id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id::UUID as user_id,
        au.email::TEXT as email
    FROM auth.users au
    WHERE au.email IS NOT NULL
    ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails() TO authenticated;

-- Test the function
SELECT 'Function created successfully' as status; 