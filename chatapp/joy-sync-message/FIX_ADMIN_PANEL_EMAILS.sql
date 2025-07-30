-- Fix Admin Panel Emails - Comprehensive Solution
-- This script will ensure all users show their real emails in the Admin Panel

-- 1. First, let's check what we have
SELECT 'Current state of profiles table:' as info;
SELECT user_id, display_name, email, real_name, is_admin FROM profiles ORDER BY created_at;

-- 2. Add email column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add real_name column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS real_name TEXT;

-- 4. Add is_admin column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_real_name ON profiles(real_name);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 6. Grant permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- 7. Update profiles with real emails from auth.users
-- This is a more comprehensive approach that handles all users
UPDATE profiles 
SET 
  email = COALESCE(
    profiles.email,
    (SELECT au.email FROM auth.users au WHERE au.id = profiles.user_id),
    'No email available'
  ),
  real_name = COALESCE(
    profiles.real_name,
    profiles.display_name,
    'Unknown User'
  ),
  display_name = COALESCE(
    profiles.display_name,
    'User ' || profiles.user_id
  )
WHERE profiles.email IS NULL 
   OR profiles.email = '' 
   OR profiles.email = 'No email available';

-- 8. Set specific users with their real data
-- Update user "mariummansoori18" with real name and email
UPDATE profiles 
SET 
  email = 'mariummansoori18@gmail.com',
  real_name = 'marium',
  display_name = 'mariummansoori18'
WHERE display_name = 'mariummansoori18';

-- Update user "suleman" with real name and email
UPDATE profiles 
SET 
  email = 'sulemanjamil05@gmail.com',
  real_name = 'suleman',
  display_name = 'suleman'
WHERE display_name = 'suleman';

-- Update user "sam" with real name and email and admin status
UPDATE profiles 
SET 
  email = 'sulemanjamil177@gmail.com',
  real_name = 'sam',
  display_name = 'sam',
  is_admin = TRUE
WHERE display_name = 'sam';

-- 9. Show final results to verify the fix
SELECT 'Final results after email fix:' as info;
SELECT 
  user_id,
  display_name,
  real_name,
  email,
  is_admin,
  created_at,
  CASE 
    WHEN email IS NULL THEN '❌ No email'
    WHEN email = '' THEN '❌ Empty email'
    WHEN email = 'No email available' THEN '❌ No email available'
    WHEN email LIKE '%@example.com' THEN '❌ Fake email'
    ELSE '✅ Real email'
  END as email_status,
  CASE 
    WHEN real_name IS NULL OR real_name = '' THEN '❌ No real name'
    ELSE '✅ Real name'
  END as name_status
FROM profiles 
ORDER BY created_at DESC;

-- 10. Create a function to sync emails in the future
CREATE OR REPLACE FUNCTION sync_user_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profiles with emails from auth.users
  UPDATE profiles 
  SET email = (
    SELECT au.email 
    FROM auth.users au 
    WHERE au.id = profiles.user_id
  )
  WHERE profiles.email IS NULL 
     OR profiles.email = '' 
     OR profiles.email = 'No email available';
END;
$$;

-- 11. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION sync_user_emails() TO authenticated;

-- 12. Show completion status
SELECT 'Admin Panel emails fix completed successfully!' as status; 