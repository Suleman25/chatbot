-- Fix Friends Table and Related Issues - SAFE VERSION
-- This script will safely create the friends table and fix all related functionality
-- It handles existing objects gracefully

-- 1. Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;

-- 2. Drop existing function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. Create friends table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- 4. Create indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_friend ON public.friends(user_id, friend_id);

-- 5. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create updated_at trigger for friends table
CREATE TRIGGER update_friends_updated_at 
    BEFORE UPDATE ON public.friends 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Grant permissions
GRANT ALL ON public.friends TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Enable RLS and create policies (drop existing first)
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

-- 9. Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_friends(UUID);
DROP FUNCTION IF EXISTS get_pending_friend_requests(UUID);

-- 10. Create function to get user's friends
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

-- 11. Create function to get pending friend requests
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

-- 12. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_friend_requests(UUID) TO authenticated;

-- 13. Show the results
SELECT 'Friends table setup completed successfully!' as status; 