-- ============================================================================
-- COMPLETE FRIENDS FIX: Fix All Friends System Issues
-- ============================================================================
-- This script will fix all friends-related problems
-- ============================================================================

-- Step 1: Disable RLS temporarily to ensure we can create everything
ALTER TABLE IF EXISTS public.friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Ensure profiles table has all users with proper emails
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

-- Step 3: Create friends table with proper structure
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

-- Step 4: Create indexes for better performance
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);
CREATE INDEX idx_friends_user_friend ON public.friends(user_id, friend_id);

-- Step 5: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 6: Create updated_at trigger for friends table
DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at 
    BEFORE UPDATE ON public.friends 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Grant permissions
GRANT ALL ON public.friends TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 8: Enable RLS and create policies
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Users can delete their own friend relationships" ON public.friends;

-- Create RLS policies for friends table
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

-- Step 9: Create helper functions
DROP FUNCTION IF EXISTS get_user_friends(UUID);
DROP FUNCTION IF EXISTS get_pending_friend_requests(UUID);

-- Create function to get user's friends
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

-- Create function to get pending friend requests
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

-- Step 10: Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_friend_requests(UUID) TO authenticated;

-- Step 11: Update profiles table RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create policy that allows users to view all profiles (needed for friends)
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

-- Create policy that allows users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Create policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 12: Re-enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 13: Add some sample friend relationships for testing
INSERT INTO public.friends (user_id, friend_id, status) VALUES
-- sam (Admin) has added Marium as friend
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', '4c296628-ed91-47c2-96db-14640269f17d', 'accepted'),
-- sam (Admin) has added suleman as friend  
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', '033314da-63a8-4789-ab4d-8b1f51659342', 'accepted'),
-- Jack has a pending request to sam
('6cc043e9-a56c-40a2-9504-46265dc7f36b', '3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'pending');

-- Step 14: Verify setup
SELECT 
    'VERIFICATION: Friends system setup completed' as status,
    COUNT(*) as total_profiles,
    (SELECT COUNT(*) FROM public.friends) as total_friendships,
    (SELECT COUNT(*) FROM public.friends WHERE status = 'accepted') as accepted_friendships,
    (SELECT COUNT(*) FROM public.friends WHERE status = 'pending') as pending_requests
FROM public.profiles;

-- Step 15: Show all users with their friend counts
SELECT 
    p.display_name,
    p.email,
    p.is_admin,
    COUNT(f.id) as friend_count
FROM public.profiles p
LEFT JOIN public.friends f ON (
    (f.user_id = p.user_id OR f.friend_id = p.user_id) 
    AND f.status = 'accepted'
)
GROUP BY p.user_id, p.display_name, p.email, p.is_admin
ORDER BY p.display_name;

-- Step 16: Show all friend relationships
SELECT 
    u1.display_name as user_name,
    u2.display_name as friend_name,
    f.status,
    f.created_at
FROM public.friends f
JOIN public.profiles u1 ON f.user_id = u1.user_id
JOIN public.profiles u2 ON f.friend_id = u2.user_id
ORDER BY f.created_at DESC; 