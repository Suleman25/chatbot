-- MANUAL FIX FOR USER DELETION ISSUE
-- Run this SQL script in Supabase SQL Editor to fix RLS policies
-- This allows admins to delete users properly

-- =========================================
-- ADD MISSING DELETE POLICIES FOR ADMINS
-- =========================================

-- Add DELETE policy for profiles table (admins only)
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add DELETE policy for messages table (admins only)  
DROP POLICY IF EXISTS "Admins can delete any message" ON public.messages;
CREATE POLICY "Admins can delete any message" 
ON public.messages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add DELETE policy for user_roles table (admins only)
DROP POLICY IF EXISTS "Admins can delete any user role" ON public.user_roles;
CREATE POLICY "Admins can delete any user role" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Add DELETE policy for friends table (admins only)
DROP POLICY IF EXISTS "Admins can delete any friend relationship" ON public.friends;
CREATE POLICY "Admins can delete any friend relationship" 
ON public.friends 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add DELETE policies for conversation tables (if they exist)
DO $$ BEGIN
    -- Check if conversations table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Admins can delete any conversation" ON public.conversations;
        
        -- Create new policy
        EXECUTE 'CREATE POLICY "Admins can delete any conversation" 
                 ON public.conversations 
                 FOR DELETE 
                 USING (
                   EXISTS (
                     SELECT 1 FROM public.user_roles 
                     WHERE user_id = auth.uid() 
                     AND role = ''admin''
                   )
                 )';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if table doesn't exist
    NULL;
END $$;

DO $$ BEGIN
    -- Check if conversation_participants table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Admins can delete any conversation participant" ON public.conversation_participants;
        
        -- Create new policy
        EXECUTE 'CREATE POLICY "Admins can delete any conversation participant" 
                 ON public.conversation_participants 
                 FOR DELETE 
                 USING (
                   EXISTS (
                     SELECT 1 FROM public.user_roles 
                     WHERE user_id = auth.uid() 
                     AND role = ''admin''
                   )
                 )';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if table doesn't exist
    NULL;
END $$;

-- =========================================
-- CREATE IMPROVED ADMIN DELETE FUNCTION
-- =========================================

CREATE OR REPLACE FUNCTION public.admin_complete_user_deletion(target_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_role public.app_role;
    deletion_count INTEGER;
    error_details TEXT := '';
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin';
    
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
    
    -- Step 1: Delete from conversation_participants (if table exists)
    BEGIN
        DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % conversation participants', deletion_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'conversation_participants table does not exist';
    WHEN OTHERS THEN
        error_details := error_details || 'Error deleting conversation participants: ' || SQLERRM || '; ';
    END;
    
    -- Step 2: Delete conversations created by user (if table exists)
    BEGIN
        DELETE FROM public.conversations WHERE created_by = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % conversations', deletion_count;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'conversations table does not exist';
    WHEN OTHERS THEN
        error_details := error_details || 'Error deleting conversations: ' || SQLERRM || '; ';
    END;
    
    -- Step 3: Delete user's messages
    BEGIN
        DELETE FROM public.messages WHERE user_id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % messages', deletion_count;
    EXCEPTION WHEN OTHERS THEN
        error_details := error_details || 'Error deleting messages: ' || SQLERRM || '; ';
    END;
    
    -- Step 4: Delete friend relationships (both directions)
    BEGIN
        DELETE FROM public.friends WHERE user_id = target_user_id OR friend_id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % friend relationships', deletion_count;
    EXCEPTION WHEN OTHERS THEN
        error_details := error_details || 'Error deleting friend relationships: ' || SQLERRM || '; ';
    END;
    
    -- Step 5: Delete user roles
    BEGIN
        DELETE FROM public.user_roles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user roles', deletion_count;
    EXCEPTION WHEN OTHERS THEN
        error_details := error_details || 'Error deleting user roles: ' || SQLERRM || '; ';
    END;
    
    -- Step 6: Delete user profile (final step)
    BEGIN
        DELETE FROM public.profiles WHERE user_id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % profiles', deletion_count;
        
        IF deletion_count = 0 THEN
            RETURN QUERY SELECT FALSE, 'Failed to delete user profile: ' || error_details;
            RETURN;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 'Critical error deleting profile: ' || SQLERRM || '; ' || error_details;
        RETURN;
    END;
    
    -- Step 7: Try to delete from auth.users (might not work without service role)
    BEGIN
        DELETE FROM auth.users WHERE id = target_user_id;
        GET DIAGNOSTICS deletion_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % auth users', deletion_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not delete from auth.users: %', SQLERRM;
        -- This is OK, user is effectively deleted from our app
    END;
    
    IF error_details != '' THEN
        RETURN QUERY SELECT TRUE, 'User deleted successfully with some warnings: ' || error_details;
    ELSE
        RETURN QUERY SELECT TRUE, 'User successfully deleted';
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_complete_user_deletion(UUID) TO authenticated;

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Check if policies were created successfully
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE '%Admins can delete%'
ORDER BY tablename, policyname;

-- Check if function was created successfully
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'admin_complete_user_deletion';

-- Test admin role check (replace with actual admin user ID)
-- SELECT public.get_user_role('YOUR_ADMIN_USER_ID_HERE');

-- =========================================
-- INSTRUCTIONS FOR USE
-- =========================================

/*
1. Copy and paste this entire SQL script into Supabase SQL Editor
2. Run the script - it will create all necessary policies and functions
3. Test user deletion from your admin interface
4. Check console logs for detailed deletion process information
5. If issues persist, check the verification queries at the bottom

The script handles:
- Missing DELETE policies for all tables
- Proper admin role checking
- Safe handling of non-existent tables
- Detailed error reporting
- Complete user deletion process

After running this script, admin user deletion should work properly
and users should not "pop back" after deletion.
*/ 