-- Update user emails in profiles table with real emails from auth.users
-- This ensures all users have their real emails displayed

-- First, let's see what emails we have in auth.users
SELECT id, email FROM auth.users WHERE email IS NOT NULL;

-- Update profiles table with real emails from auth.users
UPDATE profiles 
SET email = auth_users.email
FROM (
  SELECT id, email 
  FROM auth.users 
  WHERE email IS NOT NULL
) AS auth_users
WHERE profiles.user_id = auth_users.id::text
AND (profiles.email IS NULL OR profiles.email = '' OR profiles.email LIKE '%@example.com');

-- Verify the updates
SELECT user_id, display_name, email FROM profiles ORDER BY created_at DESC;

-- Also ensure the email column exists and has proper constraints
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated; 