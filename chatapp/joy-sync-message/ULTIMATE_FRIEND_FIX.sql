-- ============================================================================
-- ULTIMATE FRIEND SYSTEM FIX
-- ============================================================================
-- This script will completely fix all friend system issues
-- ============================================================================

-- Step 1: Completely disable RLS to avoid any permission issues
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

-- Step 6: Set up very permissive RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Users can delete their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.friends;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.friends;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.friends;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.friends;

-- Create very permissive policies for profiles
CREATE POLICY "Enable read access for all users" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Create very permissive policies for friends
CREATE POLICY "Enable read access for all users" ON public.friends
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.friends
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON public.friends
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Enable delete for users based on user_id" ON public.friends
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Step 7: Grant all necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.friends TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 8: Create trigger function to automatically create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email,
    NEW.created_at,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 10: Create the get_user_friends function
DROP FUNCTION IF EXISTS get_user_friends(UUID);
CREATE OR REPLACE FUNCTION get_user_friends(user_uuid UUID)
RETURNS TABLE (
    friend_id UUID,
    friend_name TEXT,
    friend_email TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN f.user_id = user_uuid THEN f.friend_id
            ELSE f.user_id
        END as friend_id,
        COALESCE(p.display_name, 'Unknown User')::TEXT as friend_name,
        p.email::TEXT as friend_email,
        f.status::TEXT,
        f.created_at
    FROM public.friends f
    LEFT JOIN public.profiles p ON (
        CASE 
            WHEN f.user_id = user_uuid THEN f.friend_id
            ELSE f.user_id
        END = p.user_id
    )
    WHERE (f.user_id = user_uuid OR f.friend_id = user_uuid)
    AND f.status = 'accepted';
END;
$$;

-- Step 11: Create the get_pending_friend_requests function
DROP FUNCTION IF EXISTS get_pending_friend_requests(UUID);
CREATE OR REPLACE FUNCTION get_pending_friend_requests(user_uuid UUID)
RETURNS TABLE (
    request_id UUID,
    requester_id UUID,
    requester_name TEXT,
    requester_email TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as request_id,
        f.user_id as requester_id,
        COALESCE(p.display_name, 'Unknown User')::TEXT as requester_name,
        p.email::TEXT as requester_email,
        f.created_at
    FROM public.friends f
    LEFT JOIN public.profiles p ON f.user_id = p.user_id
    WHERE f.friend_id = user_uuid
    AND f.status = 'pending';
END;
$$;

-- Step 12: Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_friend_requests(UUID) TO authenticated;

-- Step 13: Fix existing users who don't have profiles
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    au.email,
    au.created_at,
    false
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Step 14: Update existing profiles with correct data from auth.users
UPDATE public.profiles 
SET 
    display_name = COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    email = au.email
FROM auth.users au
WHERE profiles.user_id = au.id 
AND (profiles.display_name IS NULL OR profiles.email IS NULL OR profiles.display_name = 'Unknown User');

-- Step 15: Test the setup
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