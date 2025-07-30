-- Setup Friends Test Data
-- This script will create test data for the friends system

-- 1. First, let's check what users we have
SELECT 'Current users in auth.users:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users ORDER BY created_at;

-- 2. Check profiles table
SELECT 'Current profiles:' as info;
SELECT user_id, display_name, email, real_name, created_at FROM profiles ORDER BY created_at;

-- 3. Update profiles with real names and emails if they're missing
UPDATE profiles 
SET 
  email = COALESCE(email, 'user' || user_id || '@example.com'),
  real_name = COALESCE(real_name, display_name),
  display_name = COALESCE(display_name, 'User' || user_id)
WHERE email IS NULL OR real_name IS NULL OR display_name IS NULL;

-- 4. Show updated profiles
SELECT 'Updated profiles:' as info;
SELECT user_id, display_name, real_name, email FROM profiles ORDER BY created_at;

-- 5. Create some test friend relationships (if friends table exists)
-- First, let's get some user IDs
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
BEGIN
    -- Get the first few users
    SELECT id INTO user1_id FROM auth.users ORDER BY created_at LIMIT 1;
    SELECT id INTO user2_id FROM auth.users ORDER BY created_at OFFSET 1 LIMIT 1;
    SELECT id INTO user3_id FROM auth.users ORDER BY created_at OFFSET 2 LIMIT 1;
    
    -- Only proceed if we have at least 2 users
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL THEN
        -- Insert test friend relationships
        INSERT INTO friends (user_id, friend_id, status) 
        VALUES 
            (user1_id, user2_id, 'accepted'),
            (user1_id, user3_id, 'pending')
        ON CONFLICT (user_id, friend_id) DO NOTHING;
        
        RAISE NOTICE 'Test friend relationships created between users: %, %, %', user1_id, user2_id, user3_id;
    ELSE
        RAISE NOTICE 'Not enough users to create test relationships';
    END IF;
END $$;

-- 6. Show current friends data
SELECT 'Current friends data:' as info;
SELECT 
    f.id,
    f.user_id,
    f.friend_id,
    f.status,
    u1.display_name as user_name,
    u2.display_name as friend_name
FROM friends f
LEFT JOIN profiles u1 ON f.user_id = u1.user_id
LEFT JOIN profiles u2 ON f.friend_id = u2.user_id
ORDER BY f.created_at;

-- 7. Show final status
SELECT 'Friends system setup completed!' as status; 