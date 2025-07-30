-- ============================================================================
-- QUICK FIX FOR USER PROFILES
-- ============================================================================
-- This script will fix all user profile issues immediately
-- ============================================================================

-- Step 1: Ensure profiles table has email column
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Create profiles for all known users
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin)
VALUES
  ('6cc043e9-a56c-40a2-9504-46265dc7f36b', 'Jack', 'vopoh47826@kloudis.com', NOW(), false),
  ('4c296628-ed91-47c2-96db-14640269f17d', 'Marium', 'mariummansoori18@gmail.com', NOW(), false),
  ('033314da-63a8-4789-ab4d-8b1f51659342', 'suleman', 'sulemanjamil05@gmail.com', NOW(), false),
  ('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'sam', 'sulemanjamil177@gmail.com', NOW(), true),
  ('46febed0-a336-4b02-8d60-0c270ff44943', 'Tom', 'xarodeh233@coursora.com', NOW(), false)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  is_admin = EXCLUDED.is_admin;

-- Step 3: Update any existing profiles with correct data
UPDATE public.profiles 
SET 
  display_name = CASE 
    WHEN user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' THEN 'Jack'
    WHEN user_id = '4c296628-ed91-47c2-96db-14640269f17d' THEN 'Marium'
    WHEN user_id = '033314da-63a8-4789-ab4d-8b1f51659342' THEN 'suleman'
    WHEN user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' THEN 'sam'
    WHEN user_id = '46febed0-a336-4b02-8d60-0c270ff44943' THEN 'Tom'
    ELSE display_name
  END,
  email = CASE 
    WHEN user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' THEN 'vopoh47826@kloudis.com'
    WHEN user_id = '4c296628-ed91-47c2-96db-14640269f17d' THEN 'mariummansoori18@gmail.com'
    WHEN user_id = '033314da-63a8-4789-ab4d-8b1f51659342' THEN 'sulemanjamil05@gmail.com'
    WHEN user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' THEN 'sulemanjamil177@gmail.com'
    WHEN user_id = '46febed0-a336-4b02-8d60-0c270ff44943' THEN 'xarodeh233@coursora.com'
    ELSE email
  END
WHERE user_id IN (
  '6cc043e9-a56c-40a2-9504-46265dc7f36b',
  '4c296628-ed91-47c2-96db-14640269f17d',
  '033314da-63a8-4789-ab4d-8b1f51659342',
  '3e40ef5f-d957-4374-9a90-a1570c7ee1d6',
  '46febed0-a336-4b02-8d60-0c270ff44943'
);

-- Step 4: Show results
SELECT '=== VERIFICATION ===' as step;
SELECT 'Profiles count:' as info, COUNT(*) as count FROM public.profiles;
SELECT 'All profiles:' as info;
SELECT user_id, display_name, email, is_admin FROM public.profiles ORDER BY created_at DESC; 