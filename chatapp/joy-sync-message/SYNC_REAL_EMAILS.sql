-- Sync real emails from auth.users to profiles table
-- This will fix the "No email available" issue

-- 1. First, let's see what we have in auth.users
SELECT id, email, raw_user_meta_data->>'display_name' as display_name 
FROM auth.users 
WHERE email IS NOT NULL;

-- 2. Add email column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Sync emails from auth.users to profiles using the correct user IDs
UPDATE profiles 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id::text = profiles.user_id
)
WHERE profiles.user_id IN (
  SELECT id::text 
  FROM auth.users 
  WHERE email IS NOT NULL
);

-- 4. Set admin status for user "sam"
UPDATE profiles 
SET is_admin = TRUE 
WHERE display_name = 'sam';

-- 5. Show the results after sync
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

-- 6. Show summary
SELECT 
  COUNT(*) as total_users,
  COUNT(email) as users_with_emails,
  COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_users,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_emails,
  COUNT(CASE WHEN email LIKE '%@example.com' THEN 1 END) as fake_emails
FROM profiles; 