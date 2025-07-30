-- ============================================================================
-- ADMIN DELETE USER FUNCTION
-- ============================================================================
-- This function completely removes a user and all their data from the database
-- It should be called by admin users only
-- ============================================================================

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
    
    -- Check if current user is admin (only check user_roles table)
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
        RAISE NOTICE 'Deleted % sent messages', deleted_count;
        
        -- Delete all messages received by this user
        DELETE FROM public.messages WHERE receiver_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % received messages', deleted_count;
        
        -- Delete all friend relationships involving this user
        DELETE FROM public.friends 
        WHERE user_id = target_user_id OR friend_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % friend relationships', deleted_count;
        
        -- Delete conversation participants involving this user
        DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % conversation participants', deleted_count;
        
        -- Delete user roles
        DELETE FROM public.user_roles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user roles', deleted_count;
        
        -- Delete user profile
        DELETE FROM public.profiles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user profiles', deleted_count;
        
        -- Try to delete from user_status if table exists
        BEGIN
            DELETE FROM public.user_status WHERE user_id = target_user_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % user status records', deleted_count;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'user_status table does not exist, skipping';
        END;
        
        -- Try to delete from message_status if table exists
        BEGIN
            DELETE FROM public.message_status 
            WHERE message_id IN (
                SELECT id FROM public.messages 
                WHERE user_id = target_user_id OR receiver_id = target_user_id
            );
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % message status records', deleted_count;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'message_status table does not exist, skipping';
        END;
        
        -- Try to delete from conversation_read_status if table exists
        BEGIN
            DELETE FROM public.conversation_read_status 
            WHERE user_id = target_user_id OR conversation_partner_id = target_user_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % conversation read status records', deleted_count;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'conversation_read_status table does not exist, skipping';
        END;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'User and all associated data deleted successfully',
            'user_id', target_user_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'Error during user deletion: %', error_message;
        RETURN json_build_object('success', false, 'error', error_message);
    END;
    
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ============================================================================
-- ADMIN DELETE USER FUNCTION SETUP COMPLETE
-- ============================================================================
-- This function will:
-- ✅ Delete all messages sent/received by the user
-- ✅ Delete all friend relationships
-- ✅ Delete conversation participants
-- ✅ Delete user roles
-- ✅ Delete user profile
-- ✅ Delete user status (if table exists)
-- ✅ Delete message status (if table exists)
-- ✅ Delete conversation read status (if table exists)
-- ✅ Prevent admin from deleting themselves
-- ✅ Require admin privileges
-- ✅ Handle errors gracefully
-- ============================================================================ 