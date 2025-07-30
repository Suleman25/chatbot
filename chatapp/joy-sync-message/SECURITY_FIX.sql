-- ============================================================================
-- SECURITY FIX FOR SUPABASE
-- ============================================================================
-- This script fixes the security issues with SECURITY DEFINER views and functions
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop any problematic SECURITY DEFINER views
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

-- Step 2: Drop any problematic SECURITY DEFINER functions
DROP FUNCTION IF EXISTS public.get_all_users_simple() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users_direct() CASCADE;
DROP FUNCTION IF EXISTS public.get_all_users_for_admin_panel() CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_user_complete() CASCADE;
DROP FUNCTION IF EXISTS public.assign_admin_role(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_admin() CASCADE;

-- Step 3: Create a simple, secure function for admin operations
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- Return user data safely
    RETURN QUERY
    SELECT 
        p.user_id,
        COALESCE(p.display_name, 'Unknown User')::TEXT,
        COALESCE(p.display_name || '@example.com', 'user@example.com')::TEXT,
        p.created_at
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$;

-- Step 4: Create a secure admin delete function
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- Prevent self-deletion
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;

    -- Delete user roles first
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Delete user profile
    DELETE FROM public.profiles WHERE user_id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- Step 5: Grant proper permissions
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- Step 6: Create RLS policies for secure access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND is_admin = true
        ) OR EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Step 7: Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create a simple trigger for new user admin assignment (optional)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert basic profile
    INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    );
    
    -- Assign admin role for specific email (optional)
    IF NEW.email = 'sulemanjamil177@gmail.com' THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (NEW.id, 'admin', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        UPDATE public.profiles 
        SET is_admin = true 
        WHERE user_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 9: Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 10: Verify the setup
SELECT 
    'Security fix completed' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_count
FROM public.profiles;

-- ============================================================================
-- USAGE INSTRUCTIONS:
-- ============================================================================
-- 1. Admin Panel can now use: SELECT * FROM admin_get_users();
-- 2. Delete users with: SELECT admin_delete_user('user-id-here');
-- 3. All functions are properly secured with admin checks
-- 4. RLS policies ensure data protection
-- ============================================================================ 