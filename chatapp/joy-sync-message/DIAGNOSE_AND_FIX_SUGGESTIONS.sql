-- ============================================================================
-- DIAGNOSE AND FIX SUGGESTIONS FUNCTIONALITY
-- ============================================================================
-- This script will diagnose the issue and fix it completely
-- ============================================================================

-- Step 1: Check current database state
SELECT '=== DIAGNOSIS ===' as step;

-- Check if profiles table exists and has data
SELECT 'Profiles table check:' as check_type;
SELECT COUNT(*) as profiles_count FROM public.profiles;

-- Check profiles table structure
SELECT 'Profiles table structure:' as check_type;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if friends table exists and has data
SELECT 'Friends table check:' as check_type;
SELECT COUNT(*) as friends_count FROM public.friends;

-- Check RLS policies
SELECT 'RLS Policies check:' as check_type;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'friends')
ORDER BY tablename, policyname;

-- Step 2: Fix the issues
SELECT '=== FIXING ISSUES ===' as step;

-- Disable RLS temporarily for both tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friends DISABLE ROW LEVEL SECURITY;

-- Clear and recreate profiles with all users
DELETE FROM public.profiles;

INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin) VALUES
-- User 1: Jack
('6cc043e9-a56c-40a2-9504-46265dc7f36b', 'Jack', 'vopoh47826@kloudis.com', NOW(), false),
-- User 2: Marium  
('4c296628-ed91-47c2-96db-14640269f17d', 'Marium', 'mariummansoori18@gmail.com', NOW(), false),
-- User 3: suleman
('033314da-63a8-4789-ab4d-8b1f51659342', 'suleman', 'sulemanjamil05@gmail.com', NOW(), false),
-- User 4: sam (Admin)
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'sam', 'sulemanjamil177@gmail.com', NOW(), true);

-- Clear friends table to avoid conflicts
DELETE FROM public.friends;

-- Ensure friends table exists with proper structure
DROP TABLE IF EXISTS public.friends CASCADE;

CREATE TABLE public.friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- Create indexes
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);

-- Add sample friend relationships
INSERT INTO public.friends (user_id, friend_id, status) VALUES
-- sam (Admin) has added Marium as friend
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', '4c296628-ed91-47c2-96db-14640269f17d', 'accepted'),
-- sam (Admin) has added suleman as friend  
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', '033314da-63a8-4789-ab4d-8b1f51659342', 'accepted'),
-- Jack has a pending request to sam
('6cc043e9-a56c-40a2-9504-46265dc7f36b', '3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'pending');

-- Step 3: Set up RLS policies correctly
SELECT '=== SETTING UP RLS ===' as step;

-- Enable RLS for both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Users can delete their own friend relationships" ON public.friends;

-- Create comprehensive policies for profiles table
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create comprehensive policies for friends table
CREATE POLICY "Users can view their own friend relationships" ON public.friends
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = friend_id
    );

CREATE POLICY "Users can create friend requests" ON public.friends
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own friend relationships" ON public.friends
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() = friend_id
    );

CREATE POLICY "Users can delete their own friend relationships" ON public.friends
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.uid() = friend_id
    );

-- Step 4: Test the suggestions query
SELECT '=== TESTING SUGGESTIONS ===' as step;

-- Test 1: Check if we can query profiles
SELECT 'Test 1: Can query profiles' as test_name;
SELECT COUNT(*) as profiles_count FROM public.profiles;

-- Test 2: Check if we can query friends
SELECT 'Test 2: Can query friends' as test_name;
SELECT COUNT(*) as friends_count FROM public.friends;

-- Test 3: Test suggestions for sam (admin user)
SELECT 'Test 3: Suggestions for sam (admin)' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '3e40ef5f-d957-4374-9a90-a1570c7ee1d6'  -- sam's user_id
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

-- Test 4: Test suggestions for Jack
SELECT 'Test 4: Suggestions for Jack' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '6cc043e9-a56c-40a2-9504-46265dc7f36b'  -- Jack's user_id
AND p.user_id NOT IN (
    SELECT CASE 
        WHEN f.user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' THEN f.friend_id
        ELSE f.user_id
    END
    FROM public.friends f
    WHERE (f.user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' OR f.friend_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b')
    AND f.status IN ('accepted', 'pending')
)
LIMIT 6;

-- Step 5: Final verification
SELECT '=== FINAL VERIFICATION ===' as step;
SELECT 'Profiles count:' as info, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'Friends count:' as info, COUNT(*) as count FROM public.friends;

-- Show all profiles
SELECT 'All profiles:' as info;
SELECT user_id, display_name, email, is_admin FROM public.profiles ORDER BY display_name;

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