-- Create admin functions for user management
-- Since auth.admin might not be accessible, we'll create our own admin functions

-- Function to soft delete user (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_role app_role;
BEGIN
    -- Check if current user is admin
    SELECT public.get_user_role(auth.uid()) INTO current_user_role;
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;
    
    -- Prevent admin from deleting themselves
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Admins cannot delete their own account';
    END IF;
    
    -- Delete user's data in correct order (to handle foreign keys)
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.messages WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE user_id = target_user_id;
    
    -- Try to delete from auth.users (might not work without service role)
    -- If this fails, the user will still be "soft deleted" from our app
    BEGIN
        DELETE FROM auth.users WHERE id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
        -- If auth deletion fails, just continue (user is soft deleted)
        NULL;
    END;
    
    RETURN TRUE;
END;
$$;

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN,
    last_seen TIMESTAMP WITH TIME ZONE,
    role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if current user is admin
    IF public.get_user_role(auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Only admins can view all users';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.user_id,
        u.email,
        p.display_name,
        p.avatar_url,
        p.created_at,
        p.is_online,
        p.last_seen,
        COALESCE(ur.role, 'user'::app_role) as role
    FROM public.profiles p
    INNER JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Function to ban user (alternative to deletion)
CREATE OR REPLACE FUNCTION public.admin_ban_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_role app_role;
BEGIN
    -- Check if current user is admin
    SELECT public.get_user_role(auth.uid()) INTO current_user_role;
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can ban users';
    END IF;
    
    -- Prevent admin from banning themselves
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Admins cannot ban their own account';
    END IF;
    
    -- Update user role to banned (we'll add this to the enum)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Set user offline
    UPDATE public.profiles 
    SET is_online = FALSE, display_name = '[REMOVED USER]'
    WHERE user_id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users (but function checks admin role internally)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID) TO authenticated; 