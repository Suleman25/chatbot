-- ============================================================================
-- ADMIN FUNCTION FIX - Use Function to Bypass RLS
-- ============================================================================
-- Create a function to assign admin role that bypasses RLS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create a function to assign admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_email TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found', NULL::UUID;
        RETURN;
    END IF;
    
    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
    VALUES (target_user_id, split_part(target_email, '@', 1), NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Delete any existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (target_user_id, 'admin', NOW());
    
    RETURN QUERY SELECT TRUE, 'Admin role assigned successfully', target_user_id;
END;
$$;

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_admin_role(TEXT) TO authenticated;

-- Step 3: Call the function to assign admin role
SELECT * FROM public.assign_admin_role('sulemanjamil177@gmail.com');

-- Step 4: Verify the admin role was set correctly
SELECT 
    'Admin role verification:' as info,
    p.user_id,
    p.display_name,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id IN (
    SELECT id FROM auth.users WHERE email = 'sulemanjamil177@gmail.com'
);

-- Step 5: Show all admin users
SELECT 
    'All admin users:' as info,
    p.display_name,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================ 