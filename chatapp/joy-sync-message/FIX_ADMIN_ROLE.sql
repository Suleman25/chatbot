-- Fix Admin Role for sulemanjamil177@gmail.com
-- This script will ensure the user has proper admin privileges

-- Step 1: Get the user ID from auth.users
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'sulemanjamil177@gmail.com';
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;
    
    RAISE NOTICE 'Found user ID: % for email: %', target_user_id, target_email;
    
    -- Step 2: Ensure profile exists and set is_admin = true
    INSERT INTO public.profiles (user_id, display_name, is_admin, created_at, updated_at)
    VALUES (target_user_id, split_part(target_email, '@', 1), TRUE, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        is_admin = TRUE,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated profiles table for user: %', target_user_id;
    
    -- Step 3: Ensure admin role in user_roles table
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (target_user_id, 'admin', NOW())
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
        created_at = NOW();
    
    RAISE NOTICE 'Updated user_roles table for user: %', target_user_id;
    
    -- Step 4: Verify the changes
    RAISE NOTICE 'Verification:';
    RAISE NOTICE 'Profile is_admin: %', (SELECT is_admin FROM public.profiles WHERE user_id = target_user_id);
    RAISE NOTICE 'User role: %', (SELECT role FROM public.user_roles WHERE user_id = target_user_id);
    
END $$;

-- Step 5: Show current admin users
SELECT 
    p.user_id,
    p.display_name,
    p.is_admin,
    ur.role,
    u.email
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.is_admin = TRUE OR ur.role = 'admin'
ORDER BY p.created_at DESC; 