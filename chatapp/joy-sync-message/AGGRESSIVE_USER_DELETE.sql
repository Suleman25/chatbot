-- ============================================================================
-- AGGRESSIVE USER DELETION FUNCTION
-- ============================================================================
-- This function forces complete removal of user and all associated data
-- Uses CASCADE and multiple deletion strategies
-- ============================================================================

-- Drop any existing function
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);

-- Create an aggressive admin delete function
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
        -- AGGRESSIVE DELETION STRATEGY 1: Delete all messages
        DELETE FROM public.messages WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % sent messages', deleted_count;
        
        DELETE FROM public.messages WHERE receiver_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % received messages', deleted_count;
        
        -- AGGRESSIVE DELETION STRATEGY 2: Delete all friend relationships
        DELETE FROM public.friends WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % friend relationships (user_id)', deleted_count;
        
        DELETE FROM public.friends WHERE friend_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % friend relationships (friend_id)', deleted_count;
        
        -- AGGRESSIVE DELETION STRATEGY 3: Delete conversation participants
        DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % conversation participants', deleted_count;
        
        -- AGGRESSIVE DELETION STRATEGY 4: Delete user roles
        DELETE FROM public.user_roles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user roles', deleted_count;
        
        -- AGGRESSIVE DELETION STRATEGY 5: Force delete user profile
        DELETE FROM public.profiles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user profiles', deleted_count;
        
        -- AGGRESSIVE DELETION STRATEGY 6: Clean up any orphaned data
        -- Delete messages where sender no longer exists
        DELETE FROM public.messages 
        WHERE user_id NOT IN (SELECT user_id FROM public.profiles);
        
        -- Delete messages where receiver no longer exists
        DELETE FROM public.messages 
        WHERE receiver_id NOT IN (SELECT user_id FROM public.profiles);
        
        -- Delete friend relationships where users no longer exist
        DELETE FROM public.friends 
        WHERE user_id NOT IN (SELECT user_id FROM public.profiles)
           OR friend_id NOT IN (SELECT user_id FROM public.profiles);
        
        -- Delete conversation participants where users no longer exist
        DELETE FROM public.conversation_participants 
        WHERE user_id NOT IN (SELECT user_id FROM public.profiles);
        
        -- AGGRESSIVE DELETION STRATEGY 7: Final verification
        IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id) THEN
            -- Force delete again if still exists
            DELETE FROM public.profiles WHERE user_id = target_user_id;
            RAISE NOTICE 'Forced second deletion of user profile';
        END IF;
        
        -- Final check
        IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id) THEN
            RETURN json_build_object('success', false, 'error', 'User profile still exists after aggressive deletion');
        END IF;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'User completely deleted from all tables',
            'user_id', target_user_id
        );
        
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'Error during aggressive user deletion: %', error_message;
        RETURN json_build_object('success', false, 'error', error_message);
    END;
    
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ============================================================================
-- ADDITIONAL CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up any remaining orphaned data
CREATE OR REPLACE FUNCTION public.force_cleanup_orphaned_data()
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
GRANT EXECUTE ON FUNCTION public.force_cleanup_orphaned_data() TO authenticated;

-- ============================================================================
-- AGGRESSIVE USER DELETION SETUP COMPLETE
-- ============================================================================
-- This setup provides:
-- ✅ Multiple deletion strategies
-- ✅ Orphaned data cleanup
-- ✅ Force deletion verification
-- ✅ Detailed logging
-- ✅ Complete user removal
-- ============================================================================ 