-- Ultimate email fix script - works with any data types
-- This will add the email column and sync real emails

-- 1. Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. Update profiles with real emails using a different approach
UPDATE profiles 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id::text = profiles.user_id
  LIMIT 1
)
WHERE profiles.user_id IN (
  SELECT id::text 
  FROM auth.users 
  WHERE email IS NOT NULL
)
AND (profiles.email IS NULL OR profiles.email = '' OR profiles.email LIKE '%@example.com');

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 5. Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- 6. Show the results
SELECT user_id, display_name, email, is_admin, created_at 
FROM profiles 
ORDER BY created_at DESC; 