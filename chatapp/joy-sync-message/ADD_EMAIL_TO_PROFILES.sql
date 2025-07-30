-- Add email column to profiles table and populate with real emails
-- This will allow the admin panel to show real user emails

-- Step 1: Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Add is_admin column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 3: Update profiles with real emails from auth.users
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE public.profiles.user_id = auth_users.id
AND public.profiles.email IS NULL;

-- Step 4: Show current profiles with emails
SELECT 
    user_id,
    display_name,
    email,
    is_admin,
    created_at
FROM public.profiles
ORDER BY created_at DESC; 