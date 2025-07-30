-- ============================================================================
-- ROBUST ADMIN DELETE USER FUNCTION
-- ============================================================================
-- This function ensures complete user deletion with proper error handling
-- ============================================================================

-- Drop any existing function
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);

-- Create a robust admin delete function
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    deleted_messages integer := 0;
    deleted_friends integer := 0;
    deleted_roles integer := 0;
    deleted_profile integer := 0;
    error_message text;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if current user is admin
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
        GET DIAGNOSTICS deleted_messages = ROW_COUNT;
        
        -- Delete all messages received by this user
        DELETE FROM public.messages WHERE receiver_id = target_user_id;
        
        -- Delete all friend relationships involving this user
        DELETE FROM public.friends 
        WHERE user_id = target_user_id OR friend_id = target_user_id;
        GET DIAGNOSTICS deleted_friends = ROW_COUNT;
        
        -- Delete conversation participants involving this user
        DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
        
        -- Delete user roles
        DELETE FROM public.user_roles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_roles = ROW_COUNT;
        
        -- Delete user profile (this should be last)
        DELETE FROM public.profiles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_profile = ROW_COUNT;
        
        -- Verify the user was actually deleted
        IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id) THEN
            RETURN json_build_object('success', false, 'error', 'User profile still exists after deletion');
        END IF;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'User deleted successfully',
            'user_id', target_user_id,
            'deleted_messages', deleted_messages,
            'deleted_friends', deleted_friends,
            'deleted_roles', deleted_roles,
            'deleted_profile', deleted_profile
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
-- ADDITIONAL CLEANUP FUNCTION FOR ORPHANED DATA
-- ============================================================================

-- Function to clean up any orphaned data
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    orphaned_messages integer := 0;
    orphaned_friends integer := 0;
    orphaned_participants integer := 0;
BEGIN
    -- Delete messages where sender no longer exists
    DELETE FROM public.messages 
    WHERE user_id NOT IN (SELECT user_id FROM public.profiles);
    GET DIAGNOSTICS orphaned_messages = ROW_COUNT;
    
    -- Delete messages where receiver no longer exists
    DELETE FROM public.messages 
    WHERE receiver_id NOT IN (SELECT user_id FROM public.profiles);
    
    -- Delete friend relationships where users no longer exist
    DELETE FROM public.friends 
    WHERE user_id NOT IN (SELECT user_id FROM public.profiles)
       OR friend_id NOT IN (SELECT user_id FROM public.profiles);
    GET DIAGNOSTICS orphaned_friends = ROW_COUNT;
    
    -- Delete conversation participants where users no longer exist
    DELETE FROM public.conversation_participants 
    WHERE user_id NOT IN (SELECT user_id FROM public.profiles);
    GET DIAGNOSTICS orphaned_participants = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'orphaned_messages', orphaned_messages,
        'orphaned_friends', orphaned_friends,
        'orphaned_participants', orphaned_participants
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_data() TO authenticated;

-- ============================================================================
-- ROBUST ADMIN DELETE SETUP COMPLETE
-- ============================================================================
-- This setup provides:
-- ✅ Complete user deletion with verification
-- ✅ Proper error handling and logging
-- ✅ Prevention of self-deletion
-- ✅ Admin privilege verification
-- ✅ Orphaned data cleanup function
-- ✅ Detailed deletion statistics
-- ============================================================================ 