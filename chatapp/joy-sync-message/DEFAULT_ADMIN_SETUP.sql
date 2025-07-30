-- ============================================================================
-- DEFAULT ADMIN SETUP
-- ============================================================================
-- Make sulemanjamil177@gmail.com admin by default
-- Also set up automatic admin assignment for this email
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Ensure user_roles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Step 2: Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create permissive policies (allow admin operations)
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" 
ON public.user_roles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_insert_policy" 
ON public.user_roles FOR INSERT 
WITH CHECK (true);  -- Allow all inserts

DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
CREATE POLICY "user_roles_update_policy" 
ON public.user_roles FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
CREATE POLICY "user_roles_delete_policy" 
ON public.user_roles FOR DELETE 
USING (auth.uid() = user_id);

-- Step 4: Grant permissions
GRANT ALL ON public.user_roles TO authenticated;

-- Step 5: Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 6: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Step 8: Grant permissions on profiles
GRANT ALL ON public.profiles TO authenticated;

-- Step 9: Create function to assign admin role
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

-- Step 10: Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_admin_role(TEXT) TO authenticated;

-- Step 11: Make the specific user admin by default
SELECT * FROM public.assign_admin_role('sulemanjamil177@gmail.com');

-- Step 12: Create trigger function for automatic admin assignment
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Create profile for new user
    INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- If this is the admin email, assign admin role
    IF NEW.email = 'sulemanjamil177@gmail.com' THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (NEW.id, 'admin', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        -- Assign default user role
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (NEW.id, 'user', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 13: Create trigger for automatic role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin();

-- Step 14: Verify the admin role was set correctly
SELECT 
    'Default admin setup complete!' as status,
    p.user_id,
    p.display_name,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id IN (
    SELECT id FROM auth.users WHERE email = 'sulemanjamil177@gmail.com'
);

-- Step 15: Show all admin users
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
-- Now sulemanjamil177@gmail.com is admin by default
-- Any future user with this email will automatically become admin
-- ============================================================================ 