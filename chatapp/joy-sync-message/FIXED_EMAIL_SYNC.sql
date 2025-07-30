-- Fixed email sync script - handles UUID/TEXT conversion properly
-- This will fix the "operator does not exist: uuid = text" error

-- 1. First, let's see what we have in auth.users
SELECT id, email, raw_user_meta_data->>'display_name' as display_name 
FROM auth.users 
WHERE email IS NOT NULL;

-- 2. Add email column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 4. Sync emails from auth.users to profiles using proper type casting
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
);

-- 5. Set admin status for user "sam"
UPDATE profiles 
SET is_admin = TRUE 
WHERE display_name = 'sam';

-- 6. Show the results after sync
SELECT 
  p.user_id,
  p.display_name,
  p.email,
  p.is_admin,
  p.created_at,
  CASE 
    WHEN p.email IS NULL THEN '❌ No email'
    WHEN p.email LIKE '%@example.com' THEN '❌ Fake email'
    ELSE '✅ Real email'
  END as email_status
FROM profiles p
ORDER BY p.created_at DESC;

-- 7. Show summary
SELECT 
  COUNT(*) as total_users,
  COUNT(email) as users_with_emails,
  COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_users,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_emails,
  COUNT(CASE WHEN email LIKE '%@example.com' THEN 1 END) as fake_emails
FROM profiles; 