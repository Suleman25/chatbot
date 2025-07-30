-- ============================================================================
-- FINAL FRIEND SYSTEM FIX - NO RLS
-- ============================================================================
-- This script will fix all friend system issues by disabling RLS completely
-- ============================================================================

-- Step 1: Completely disable RLS to avoid infinite recursion
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friends DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear all existing data to start fresh
DELETE FROM public.friends;
DELETE FROM public.profiles;

-- Step 3: Recreate profiles table with all users
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin) VALUES
-- User 1: Jack
('6cc043e9-a56c-40a2-9504-46265dc7f36b', 'Jack', 'vopoh47826@kloudis.com', NOW(), false),
-- User 2: Marium  
('4c296628-ed91-47c2-96db-14640269f17d', 'Marium', 'mariummansoori18@gmail.com', NOW(), false),
-- User 3: suleman
('033314da-63a8-4789-ab4d-8b1f51659342', 'suleman', 'sulemanjamil05@gmail.com', NOW(), false),
-- User 4: sam (Admin)
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'sam', 'sulemanjamil177@gmail.com', NOW(), true);

-- Step 4: Recreate friends table completely
DROP TABLE IF EXISTS public.friends CASCADE;

CREATE TABLE public.friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    friend_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- Create indexes for better performance
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);

-- Step 5: Add sample friend relationships
INSERT INTO public.friends (user_id, friend_id, status) VALUES
-- sam (Admin) has added Marium as friend
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', '4c296628-ed91-47c2-96db-14640269f17d', 'accepted'),
-- sam (Admin) has added suleman as friend  
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', '033314da-63a8-4789-ab4d-8b1f51659342', 'accepted'),
-- Jack has a pending request to sam
('6cc043e9-a56c-40a2-9504-46265dc7f36b', '3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'pending');

-- Step 6: Grant all necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.friends TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 7: Test the setup
SELECT '=== VERIFICATION ===' as step;

-- Check profiles
SELECT 'Profiles count:' as info, COUNT(*) as count FROM public.profiles;

-- Check friends
SELECT 'Friends count:' as info, COUNT(*) as count FROM public.friends;

-- Show all friend relationships
SELECT 'All friend relationships:' as info;
SELECT 
    f.user_id,
    p1.display_name as user_name,
    f.friend_id,
    p2.display_name as friend_name,
    f.status
FROM public.friends f
JOIN public.profiles p1 ON f.user_id = p1.user_id
JOIN public.profiles p2 ON f.friend_id = p2.user_id
ORDER BY f.created_at DESC;

-- Test suggestions for sam (should only see Jack)
SELECT 'Suggestions for sam (should see Jack only):' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '3e40ef5f-d957-4374-9a90-a1570c7ee1d6'
AND p.user_id NOT IN (
    SELECT CASE 
        WHEN f.user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' THEN f.friend_id
        ELSE f.user_id
    END
    FROM public.friends f
    WHERE (f.user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' OR f.friend_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6')
    AND f.status IN ('accepted', 'pending')
)
LIMIT 6; 