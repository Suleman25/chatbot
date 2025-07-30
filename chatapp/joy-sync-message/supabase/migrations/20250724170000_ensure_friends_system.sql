-- Comprehensive Friends System Setup Migration
-- This ensures all components of the friends system are properly configured

-- First, check if tables exist and create them if needed
-- Create friends table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- Create profiles table if it doesn't exist (needed for friends system)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own friends and friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can manage their own friend relationships" ON public.friends;
DROP POLICY IF EXISTS "Friends read policy" ON public.friends;
DROP POLICY IF EXISTS "Friends write policy" ON public.friends;
DROP POLICY IF EXISTS "Friends delete policy" ON public.friends;

-- Create comprehensive RLS policies for friends table
CREATE POLICY "friends_select_policy" 
ON public.friends 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "friends_insert_policy" 
ON public.friends 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "friends_update_policy" 
ON public.friends 
FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "friends_delete_policy" 
ON public.friends 
FOR DELETE 
USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Drop existing profiles policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (true); -- Allow all users to view profiles (needed for friends system)

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "profiles_delete_policy" 
ON public.profiles 
FOR DELETE 
USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create helper functions for friends system
CREATE OR REPLACE FUNCTION public.send_friend_request(friend_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    existing_friendship_id UUID;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trying to add self
    IF current_user_id = friend_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot send friend request to yourself');
    END IF;
    
    -- Check if friendship already exists
    SELECT id INTO existing_friendship_id
    FROM public.friends 
    WHERE (user_id = current_user_id AND friend_id = friend_user_id)
       OR (user_id = friend_user_id AND friend_id = current_user_id);
    
    IF existing_friendship_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Friendship already exists or request already sent');
    END IF;
    
    -- Create friend request
    INSERT INTO public.friends (user_id, friend_id, status)
    VALUES (current_user_id, friend_user_id, 'pending');
    
    RETURN json_build_object('success', true, 'message', 'Friend request sent successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    request_exists boolean;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if request exists and user is the recipient
    SELECT EXISTS(
        SELECT 1 FROM public.friends 
        WHERE id = request_id 
        AND friend_id = current_user_id 
        AND status = 'pending'
    ) INTO request_exists;
    
    IF NOT request_exists THEN
        RETURN json_build_object('success', false, 'error', 'Friend request not found or already processed');
    END IF;
    
    -- Update status to accepted
    UPDATE public.friends 
    SET status = 'accepted', updated_at = now()
    WHERE id = request_id;
    
    RETURN json_build_object('success', true, 'message', 'Friend request accepted');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create function to reject friend request
CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    request_exists boolean;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if request exists and user is the recipient
    SELECT EXISTS(
        SELECT 1 FROM public.friends 
        WHERE id = request_id 
        AND friend_id = current_user_id 
        AND status = 'pending'
    ) INTO request_exists;
    
    IF NOT request_exists THEN
        RETURN json_build_object('success', false, 'error', 'Friend request not found or already processed');
    END IF;
    
    -- Delete the friend request
    DELETE FROM public.friends WHERE id = request_id;
    
    RETURN json_build_object('success', true, 'message', 'Friend request rejected');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create function to remove friend
CREATE OR REPLACE FUNCTION public.remove_friend(friend_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    friendship_id UUID;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Find the friendship
    SELECT id INTO friendship_id
    FROM public.friends 
    WHERE ((user_id = current_user_id AND friend_id = friend_user_id) OR 
           (user_id = friend_user_id AND friend_id = current_user_id))
    AND status = 'accepted';
    
    IF friendship_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Friendship not found');
    END IF;
    
    -- Delete the friendship
    DELETE FROM public.friends WHERE id = friendship_id;
    
    RETURN json_build_object('success', true, 'message', 'Friend removed successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at
    BEFORE UPDATE ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated; 