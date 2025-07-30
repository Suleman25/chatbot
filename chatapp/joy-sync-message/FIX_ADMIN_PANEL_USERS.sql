-- ============================================================================
-- FIX ADMIN PANEL: Add Email Column and Ensure All Users Are Displayed
-- ============================================================================
-- This script fixes the admin panel to show all users with their emails
-- ============================================================================

-- Step 1: Add email column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
    ELSE
        RAISE NOTICE 'Email column already exists in profiles table';
    END IF;
END $$;

-- Step 2: Update profiles with email from auth.users
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND profiles.email IS NULL;

-- Step 3: Create a function to sync emails from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_user_emails()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when auth.users is updated
    UPDATE public.profiles 
    SET email = NEW.email
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger to automatically sync emails
DROP TRIGGER IF EXISTS sync_emails_trigger ON auth.users;
CREATE TRIGGER sync_emails_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_emails();

-- Step 5: Ensure all users have profiles
INSERT INTO public.profiles (user_id, display_name, email, created_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Step 6: Update existing profiles with missing emails
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND (profiles.email IS NULL OR profiles.email = '');

-- Step 7: Create a view for admin panel to easily get all users with emails
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
    p.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.created_at,
    p.is_admin,
    au.created_at as auth_created_at
FROM public.profiles p
JOIN auth.users au ON p.user_id = au.id
ORDER BY p.created_at DESC;

-- Step 8: Grant permissions for the view
GRANT SELECT ON admin_users_view TO authenticated;

-- Step 9: Create a function to get all users for admin panel
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.display_name,
        COALESCE(p.email, au.email) as email,
        p.created_at,
        p.is_admin
    FROM public.profiles p
    JOIN auth.users au ON p.user_id = au.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- Step 11: Update RLS policies to allow admin access
CREATE POLICY "admin_profiles_select_policy" ON public.profiles 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

-- Step 12: Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_uuid AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Grant execute permission for admin check
GRANT EXECUTE ON FUNCTION is_user_admin() TO authenticated;

-- Step 14: Create a comprehensive admin function
CREATE OR REPLACE FUNCTION get_admin_users_data()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN,
    auth_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.user_id,
        p.display_name,
        COALESCE(p.email, au.email) as email,
        p.created_at,
        p.is_admin,
        au.created_at as auth_created_at
    FROM public.profiles p
    JOIN auth.users au ON p.user_id = au.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_users_data() TO authenticated;

-- Step 16: Create a function to set user as admin
CREATE OR REPLACE FUNCTION set_user_as_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Update the target user to be admin
    UPDATE public.profiles 
    SET is_admin = true
    WHERE user_id = target_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 17: Grant execute permission
GRANT EXECUTE ON FUNCTION set_user_as_admin(UUID) TO authenticated;

-- Step 18: Create a function to remove admin from user
CREATE OR REPLACE FUNCTION remove_user_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Don't allow removing admin from self
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot remove admin privileges from yourself';
    END IF;
    
    -- Update the target user to remove admin
    UPDATE public.profiles 
    SET is_admin = false
    WHERE user_id = target_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 19: Grant execute permission
GRANT EXECUTE ON FUNCTION remove_user_admin(UUID) TO authenticated;

-- Step 20: Final verification query
SELECT 
    'Database setup complete' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.profiles; 