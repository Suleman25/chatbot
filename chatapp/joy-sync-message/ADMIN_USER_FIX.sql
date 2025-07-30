-- Fix Admin User Role for sulemanjamil177@gmail.com
-- This script ensures the admin user has the correct role in the database

-- First, let's check if the user exists in profiles table
SELECT * FROM profiles WHERE email = 'sulemanjamil177@gmail.com';

-- Check if the user has a role in user_roles table
SELECT * FROM user_roles WHERE user_id IN (
  SELECT user_id FROM profiles WHERE email = 'sulemanjamil177@gmail.com'
);

-- Insert or update the admin role for the user
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  user_id,
  'admin' as role,
  NOW() as created_at
FROM profiles 
WHERE email = 'sulemanjamil177@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = NOW();

-- Verify the admin role was set correctly
SELECT 
  p.user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.email = 'sulemanjamil177@gmail.com';

-- Show all admin users
SELECT 
  p.user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC; 