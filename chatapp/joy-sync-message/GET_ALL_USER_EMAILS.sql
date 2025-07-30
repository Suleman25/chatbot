-- ============================================================================
-- GET ALL USER EMAILS
-- ============================================================================
-- This script shows all users with their real email addresses
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Show all users with their emails
SELECT 
    'All users with emails:' as info,
    p.user_id,
    p.display_name,
    u.email,
    p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Count total users
SELECT 
    'User count:' as info,
    COUNT(*) as total_users
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- This shows all users with their real email addresses
-- ============================================================================ 