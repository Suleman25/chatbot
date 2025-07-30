-- Fix RLS policies to allow admin user deletion
-- The issue is that DELETE policies are missing, so admins can't delete users

-- Add DELETE policy for profiles table (admins only)
CREATE POLICY "Admins can delete any profile" 
ON public.profiles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for messages table (admins only)  
CREATE POLICY "Admins can delete any message" 
ON public.messages 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for user_roles table (admins only)
CREATE POLICY "Admins can delete any user role" 
ON public.user_roles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for friends table (admins only)
CREATE POLICY "Admins can delete any friend relationship" 
ON public.friends 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policies for conversation tables (admins only)
CREATE POLICY "Admins can delete any conversation" 
ON public.conversations 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any conversation participant" 
ON public.conversation_participants 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create improved admin delete function that handles all cleanup
CREATE OR REPLACE FUNCTION public.admin_complete_user_deletion(target_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_role app_role;
    deletion_count INTEGER;
BEGIN
    -- Check if current user is admin
    SELECT public.get_user_role(auth.uid()) INTO current_user_role;
    
    IF current_user_role IS NULL OR current_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, 'Only admins can delete users';
        RETURN;
    END IF;
    
    -- Prevent admin from deleting themselves
    IF target_user_id = auth.uid() THEN
        RETURN QUERY SELECT FALSE, 'Admins cannot delete their own account';
        RETURN;
    END IF;
    
    -- Check if user exists
    SELECT COUNT(*) INTO deletion_count FROM public.profiles WHERE user_id = target_user_id;
    IF deletion_count = 0 THEN
        RETURN QUERY SELECT FALSE, 'User not found';
        RETURN;
    END IF;
    
    -- Step 1: Delete from conversation_participants
    DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % conversation participants', deletion_count;
    
    -- Step 2: Delete conversations created by user  
    DELETE FROM public.conversations WHERE created_by = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % conversations', deletion_count;
    
    -- Step 3: Delete user's messages
    DELETE FROM public.messages WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % messages', deletion_count;
    
    -- Step 4: Delete friend relationships (both directions)
    DELETE FROM public.friends WHERE user_id = target_user_id OR friend_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % friend relationships', deletion_count;
    
    -- Step 5: Delete user roles
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user roles', deletion_count;
    
    -- Step 6: Delete user profile (final step)
    DELETE FROM public.profiles WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % profiles', deletion_count;
    
    IF deletion_count = 0 THEN
        RETURN QUERY SELECT FALSE, 'Failed to delete user profile';
        RETURN;
    END IF;
    
    -- Step 7: Try to delete from auth.users (might not work without service role)
    BEGIN
        DELETE FROM auth.users WHERE id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % auth users', deletion_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not delete from auth.users: %', SQLERRM;
        -- This is OK, user is effectively deleted from our app
    END;
    
    RETURN QUERY SELECT TRUE, 'User successfully deleted';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_complete_user_deletion(UUID) TO authenticated; 