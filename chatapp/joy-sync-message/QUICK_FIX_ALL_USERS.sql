-- ============================================================================
-- QUICK FIX: Force Add All 4 Users to Admin Panel
-- ============================================================================
-- This script will ensure ALL 4 users are visible in admin panel
-- ============================================================================

-- Step 1: Disable RLS temporarily to ensure we can insert all users
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear existing profiles to start fresh
DELETE FROM public.profiles;

-- Step 3: Add email column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 4: Insert ALL 4 users directly with their correct data
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin) VALUES
-- User 1: Jack
('6cc043e9-a56c-40a2-9504-46265dc7f36b', 'Jack', 'vopoh47826@kloudis.com', NOW(), false),
-- User 2: Marium  
('4c296628-ed91-47c2-96db-14640269f17d', 'Marium', 'mariummansoori18@gmail.com', NOW(), false),
-- User 3: suleman
('033314da-63a8-4789-ab4d-8b1f51659342', 'suleman', 'sulemanjamil05@gmail.com', NOW(), false),
-- User 4: sam (Admin)
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'sam', 'sulemanjamil177@gmail.com', NOW(), true);

-- Step 5: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Update RLS policy to allow admin to see all users
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Create new policy that allows admin to see all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Also allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (user_id = auth.uid());

-- Step 7: Verify all users are in the table
SELECT 
    'VERIFICATION: All users added' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.profiles;

-- Step 8: Show detailed list of all users
SELECT 
    user_id,
    display_name,
    email,
    is_admin,
    created_at
FROM public.profiles 
ORDER BY created_at DESC; 