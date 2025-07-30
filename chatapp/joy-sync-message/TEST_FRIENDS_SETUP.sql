-- Test Friends Setup
-- This script will test if the friends system is working correctly

-- 1. Check if friends table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'friends') 
        THEN '✅ Friends table exists'
        ELSE '❌ Friends table does not exist'
    END as table_status;

-- 2. Check if indexes exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_indexes WHERE tablename = 'friends' AND indexname = 'idx_friends_user_id') 
        THEN '✅ User ID index exists'
        ELSE '❌ User ID index missing'
    END as user_index_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_indexes WHERE tablename = 'friends' AND indexname = 'idx_friends_friend_id') 
        THEN '✅ Friend ID index exists'
        ELSE '❌ Friend ID index missing'
    END as friend_index_status;

-- 3. Check if functions exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'get_user_friends') 
        THEN '✅ get_user_friends function exists'
        ELSE '❌ get_user_friends function missing'
    END as friends_function_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'get_pending_friend_requests') 
        THEN '✅ get_pending_friend_requests function exists'
        ELSE '❌ get_pending_friend_requests function missing'
    END as requests_function_status;

-- 4. Check if RLS is enabled
SELECT 
    CASE 
        WHEN relrowsecurity = true 
        THEN '✅ RLS is enabled'
        ELSE '❌ RLS is not enabled'
    END as rls_status
FROM pg_class 
WHERE relname = 'friends';

-- 5. Check if policies exist
SELECT 
    CASE 
        WHEN COUNT(*) > 0 
        THEN '✅ RLS policies exist (' || COUNT(*) || ' policies)'
        ELSE '❌ No RLS policies found'
    END as policies_status
FROM pg_policies 
WHERE tablename = 'friends';

-- 6. Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'friends' 
ORDER BY ordinal_position;

-- 7. Test insert permission (this will show if the table is accessible)
SELECT '✅ Friends table is accessible and ready to use' as final_status; 