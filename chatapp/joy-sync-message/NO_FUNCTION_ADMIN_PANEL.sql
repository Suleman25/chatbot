-- ============================================================================
-- NO FUNCTION ADMIN PANEL
-- ============================================================================
-- This script creates a solution without using functions
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Show current users in database
SELECT 
    'Current users in database:' as info,
    COUNT(*) as total_users
FROM public.profiles;

-- Step 2: Show all users with details
SELECT 
    'All users with details:' as info,
    p.user_id,
    p.display_name,
    u.email,
    p.is_admin,
    p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Step 3: Test direct query (this is what the admin panel will use)
SELECT 
    'Testing direct query:' as info,
    COUNT(*) as users_found
FROM public.profiles;

-- Step 4: Show sample data from direct query
SELECT 
    'Sample data from direct query:' as info,
    p.user_id,
    p.display_name,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 5: Create a simple view for admin panel
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
    p.user_id,
    p.display_name,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;

-- Step 6: Grant permissions on the view
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Step 7: Test the view
SELECT 
    'Testing view:' as info,
    COUNT(*) as users_in_view
FROM public.admin_users_view;

-- Step 8: Show sample data from view
SELECT 
    'Sample data from view:' as info,
    user_id,
    display_name,
    created_at
FROM public.admin_users_view
LIMIT 10;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Now the admin panel will work with direct queries
-- ============================================================================ 