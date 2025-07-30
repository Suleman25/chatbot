-- ============================================================================
-- FRIENDS TABLE COMPLETE SETUP MIGRATION
-- ============================================================================
-- This migration ensures the friends table is properly set up with all
-- necessary components including RLS policies and helper functions
-- ============================================================================

-- ===== FRIENDS TABLE CREATION =====

-- Drop existing friends table if it has issues (optional - use carefully)
-- DROP TABLE IF EXISTS public.friends CASCADE;

-- Create friends table with proper structure
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_created_at ON public.friends(created_at);

-- ===== ENABLE RLS =====

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- ===== DROP EXISTING POLICIES =====

DROP POLICY IF EXISTS "friends_select_policy" ON public.friends;
DROP POLICY IF EXISTS "friends_insert_policy" ON public.friends;
DROP POLICY IF EXISTS "friends_update_policy" ON public.friends;
DROP POLICY IF EXISTS "friends_delete_policy" ON public.friends;

-- ===== CREATE RLS POLICIES =====

-- Select Policy: Users can see their friends and friend requests
CREATE POLICY "friends_select_policy" 
ON public.friends FOR SELECT 
USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
);

-- Insert Policy: Users can only create friend requests where they are the requester
CREATE POLICY "friends_insert_policy" 
ON public.friends FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update Policy: Users can update friend requests where they are involved
CREATE POLICY "friends_update_policy" 
ON public.friends FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
);

-- Delete Policy: Users can delete friendships where they are involved
CREATE POLICY "friends_delete_policy" 
ON public.friends FOR DELETE 
USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
);

-- ===== HELPER FUNCTIONS FOR FRIENDS =====

-- Function to send friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(friend_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    existing_friendship_id UUID;
    requester_profile RECORD;
    target_profile RECORD;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if trying to add themselves
    IF current_user_id = friend_user_id THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Cannot send friend request to yourself'
        );
    END IF;
    
    -- Check if target user exists
    SELECT user_id, display_name INTO target_profile
    FROM public.profiles 
    WHERE user_id = friend_user_id;
    
    IF target_profile IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'User not found'
        );
    END IF;
    
    -- Check if friendship already exists (in either direction)
    SELECT id INTO existing_friendship_id
    FROM public.friends 
    WHERE (user_id = current_user_id AND friend_id = friend_user_id)
       OR (user_id = friend_user_id AND friend_id = current_user_id);
    
    IF existing_friendship_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Friendship already exists or request already sent'
        );
    END IF;
    
    -- Get requester profile
    SELECT user_id, display_name INTO requester_profile
    FROM public.profiles 
    WHERE user_id = current_user_id;
    
    -- Insert new friend request
    INSERT INTO public.friends (user_id, friend_id, status)
    VALUES (current_user_id, friend_user_id, 'pending');
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Friend request sent successfully',
        'requester', requester_profile.display_name,
        'target', target_profile.display_name
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    friend_request RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get the friend request details
    SELECT * INTO friend_request
    FROM public.friends 
    WHERE id = request_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
    
    IF friend_request IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Friend request not found or already processed'
        );
    END IF;
    
    -- Update the friend request to accepted
    UPDATE public.friends 
    SET status = 'accepted', updated_at = now()
    WHERE id = request_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Friend request accepted successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;

-- Function to reject friend request
CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Delete the friend request
    DELETE FROM public.friends 
    WHERE id = request_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Friend request not found or already processed'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Friend request rejected successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;

-- Function to remove existing friend
CREATE OR REPLACE FUNCTION public.remove_friend(friend_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    deleted_count INTEGER;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Delete friendship (works in both directions)
    DELETE FROM public.friends 
    WHERE (user_id = current_user_id AND friend_id = friend_user_id)
       OR (user_id = friend_user_id AND friend_id = current_user_id);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Friendship not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Friend removed successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM
    );
END;
$$;

-- Function to get friends list with details
CREATE OR REPLACE FUNCTION public.get_friends_list()
RETURNS TABLE (
    friendship_id UUID,
    friend_user_id UUID,
    friend_display_name TEXT,
    friend_avatar_url TEXT,
    friendship_status TEXT,
    friendship_created_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        f.id as friendship_id,
        CASE 
            WHEN f.user_id = auth.uid() THEN f.friend_id
            ELSE f.user_id
        END as friend_user_id,
        p.display_name as friend_display_name,
        p.avatar_url as friend_avatar_url,
        f.status as friendship_status,
        f.created_at as friendship_created_at,
        CASE 
            WHEN us.status = 'online' THEN true
            ELSE false
        END as is_online
    FROM public.friends f
    JOIN public.profiles p ON (
        CASE 
            WHEN f.user_id = auth.uid() THEN p.user_id = f.friend_id
            ELSE p.user_id = f.user_id
        END
    )
    LEFT JOIN public.user_status us ON us.user_id = p.user_id
    WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid())
    AND f.status = 'accepted'
    ORDER BY p.display_name;
$$;

-- Function to get pending friend requests
CREATE OR REPLACE FUNCTION public.get_friend_requests()
RETURNS TABLE (
    request_id UUID,
    requester_id UUID,
    requester_display_name TEXT,
    requester_avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        f.id as request_id,
        f.user_id as requester_id,
        p.display_name as requester_display_name,
        p.avatar_url as requester_avatar_url,
        f.created_at
    FROM public.friends f
    JOIN public.profiles p ON p.user_id = f.user_id
    WHERE f.friend_id = auth.uid()
    AND f.status = 'pending'
    ORDER BY f.created_at DESC;
$$;

-- ===== TRIGGERS =====

-- Function for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_friends_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger for friends table
DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at 
BEFORE UPDATE ON public.friends 
FOR EACH ROW EXECUTE FUNCTION public.update_friends_updated_at();

-- ===== GRANTS =====

-- Grant permissions on friends table
GRANT ALL ON public.friends TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_requests() TO authenticated;

-- ===== TEST DATA (Optional - for development) =====

-- Insert some test data if no friends exist (uncomment if needed)
/*
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Only insert test data if we have a current user and no existing friends
    IF auth.uid() IS NOT NULL THEN
        SELECT user_id INTO test_user_id FROM public.friends WHERE user_id = auth.uid() LIMIT 1;
        
        IF test_user_id IS NULL THEN
            -- This would require actual user IDs from your auth.users table
            -- INSERT INTO public.friends (user_id, friend_id, status) VALUES (auth.uid(), 'some-friend-uuid', 'accepted');
            RAISE NOTICE 'Test data insertion skipped - add manually if needed';
        END IF;
    END IF;
END $$;
*/

-- ============================================================================
-- FRIENDS TABLE SETUP COMPLETE
-- ============================================================================
-- The friends table is now fully configured with:
-- ✅ Proper table structure with indexes
-- ✅ Row Level Security policies
-- ✅ Helper functions for all friend operations
-- ✅ Triggers for automatic updates
-- ✅ Proper permissions and grants
-- 
-- Available functions:
-- - send_friend_request(UUID) - Send friend request
-- - accept_friend_request(UUID) - Accept incoming request  
-- - reject_friend_request(UUID) - Reject incoming request
-- - remove_friend(UUID) - Remove existing friend
-- - get_friends_list() - Get all accepted friends with details
-- - get_friend_requests() - Get all pending requests
--
-- Your friends system is ready to use! 🎉
-- ============================================================================ 