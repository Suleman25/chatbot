-- ============================================================================
-- CLEAN ADMIN DELETE USER FUNCTION (NO is_admin COLUMN)
-- ============================================================================
-- This function completely removes a user and all their data
-- Uses only user_roles table for admin verification (no is_admin column)
-- ============================================================================

-- Drop any existing function
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);

-- Create a clean admin delete function (no is_admin references)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    deleted_count integer := 0;
    error_message text;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if current user is admin (ONLY check user_roles table)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = current_user_id AND role = 'admin'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Admin privileges required');
    END IF;
    
    -- Check if target user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Prevent admin from deleting themselves
    IF current_user_id = target_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot delete yourself');
    END IF;
    
    BEGIN
        -- Delete all messages sent by this user
        DELETE FROM public.messages WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Delete all messages received by this user
        DELETE FROM public.messages WHERE receiver_id = target_user_id;
        
        -- Delete all friend relationships involving this user
        DELETE FROM public.friends 
        WHERE user_id = target_user_id OR friend_id = target_user_id;
        
        -- Delete conversation participants involving this user
        DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
        
        -- Delete user roles
        DELETE FROM public.user_roles WHERE user_id = target_user_id;
        
        -- Delete user profile (this should be last)
        DELETE FROM public.profiles WHERE user_id = target_user_id;
        
        -- Verify the user was actually deleted
        IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id) THEN
            RETURN json_build_object('success', false, 'error', 'User profile still exists after deletion');
        END IF;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'User deleted successfully',
            'user_id', target_user_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'Error during user deletion: %', error_message;
        RETURN json_build_object('success', false, 'error', error_message);
    END;
    
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ============================================================================
-- CLEAN ADMIN DELETE SETUP COMPLETE
-- ============================================================================
-- This function:
-- ✅ Uses ONLY user_roles table for admin verification
-- ✅ NO references to is_admin column
-- ✅ Deletes all user data completely
-- ✅ Prevents self-deletion
-- ✅ Verifies deletion was successful
-- ✅ Handles errors gracefully
-- ============================================================================ 