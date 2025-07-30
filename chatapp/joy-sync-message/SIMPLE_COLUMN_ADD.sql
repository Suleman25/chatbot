-- Simple column addition script - no data operations
-- This just adds the missing columns to the profiles table

-- 1. Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 4. Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- 5. Show current profiles structure
SELECT user_id, display_name, email, is_admin, created_at 
FROM profiles 
ORDER BY created_at DESC; 