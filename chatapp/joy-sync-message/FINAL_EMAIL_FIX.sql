-- Final email fix script - no data type issues
-- This will add the email column and sync real emails using a function

-- 1. Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. Create a function to get email by user_id
CREATE OR REPLACE FUNCTION get_user_email(user_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id::text = user_id_param
    LIMIT 1;
    
    RETURN user_email;
END;
$$;

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_email(TEXT) TO authenticated;

-- 5. Update profiles with real emails using the function
UPDATE profiles 
SET email = get_user_email(user_id)
WHERE (email IS NULL OR email = '' OR email LIKE '%@example.com')
AND user_id IS NOT NULL;

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 7. Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- 8. Show the results
SELECT user_id, display_name, email, is_admin, created_at 
FROM profiles 
ORDER BY created_at DESC; 