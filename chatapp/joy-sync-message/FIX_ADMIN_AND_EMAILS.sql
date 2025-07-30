-- Fix admin status and sync all real emails
-- This will update admin status and sync emails from auth.users

-- 1. First, let's see what users we have in auth.users
SELECT id, email FROM auth.users WHERE email IS NOT NULL;

-- 2. Update admin status for user "sam" (you can modify the user_id)
UPDATE profiles 
SET is_admin = TRUE 
WHERE display_name = 'sam';

-- 3. Sync ALL emails from auth.users to profiles table
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

-- 4. Show the results after updates
SELECT user_id, display_name, email, is_admin, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 5. Show summary of what was updated
SELECT 
  COUNT(*) as total_users,
  COUNT(email) as users_with_emails,
  COUNT(CASE WHEN is_admin = TRUE THEN 1 END) as admin_users,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_emails
FROM profiles; 