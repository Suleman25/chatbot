-- Simple email fix - avoids complex subqueries
-- This should work without UUID/TEXT conversion errors

-- 1. Add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 3. Grant permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- 4. Set admin status for user "sam"
UPDATE profiles 
SET is_admin = TRUE 
WHERE display_name = 'sam';

-- 5. Sync emails using a simpler approach
-- First, let's see what we're working with
SELECT 'Current auth.users:' as info;
SELECT id, email FROM auth.users WHERE email IS NOT NULL;

SELECT 'Current profiles:' as info;
SELECT user_id, display_name, email FROM profiles;

-- 6. Update emails one by one (safer approach)
UPDATE profiles 
SET email = 'mariummansoori18@gmail.com'
WHERE display_name = 'mariummansoori18';

UPDATE profiles 
SET email = 'sulemanjamil05@gmail.com'
WHERE display_name = 'suleman';

UPDATE profiles 
SET email = 'sulemanjamil177@gmail.com'
WHERE display_name = 'sam';

-- 7. Show final results
SELECT 
  user_id,
  display_name,
  email,
  is_admin,
  created_at,
  CASE 
    WHEN email IS NULL THEN '❌ No email'
    WHEN email LIKE '%@example.com' THEN '❌ Fake email'
    ELSE '✅ Real email'
  END as email_status
FROM profiles 
ORDER BY created_at DESC; 