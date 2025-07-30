-- ============================================================================
-- TEST SUGGESTIONS FUNCTIONALITY
-- ============================================================================
-- This script tests if the suggestions functionality is working
-- ============================================================================

-- Test 1: Check if all users are in profiles table
SELECT 'Test 1: Profiles Table' as test_name;
SELECT user_id, display_name, email, is_admin FROM public.profiles ORDER BY display_name;

-- Test 2: Check if friends table has data
SELECT 'Test 2: Friends Table' as test_name;
SELECT 
    f.user_id,
    p1.display_name as user_name,
    f.friend_id,
    p2.display_name as friend_name,
    f.status
FROM public.friends f
JOIN public.profiles p1 ON f.user_id = p1.user_id
JOIN public.profiles p2 ON f.friend_id = p2.user_id
ORDER BY f.created_at DESC;

-- Test 3: Test suggestions for sam (admin user)
SELECT 'Test 3: Suggestions for sam (admin)' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '3e40ef5f-d957-4374-9a90-a1570c7ee1d6'  -- sam's user_id
AND p.user_id NOT IN (
    SELECT CASE 
        WHEN f.user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' THEN f.friend_id
        ELSE f.user_id
    END
    FROM public.friends f
    WHERE (f.user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' OR f.friend_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6')
    AND f.status IN ('accepted', 'pending')
)
LIMIT 6;

-- Test 4: Test suggestions for Jack
SELECT 'Test 4: Suggestions for Jack' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '6cc043e9-a56c-40a2-9504-46265dc7f36b'  -- Jack's user_id
AND p.user_id NOT IN (
    SELECT CASE 
        WHEN f.user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' THEN f.friend_id
        ELSE f.user_id
    END
    FROM public.friends f
    WHERE (f.user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' OR f.friend_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b')
    AND f.status IN ('accepted', 'pending')
)
LIMIT 6;

-- Test 5: Check RLS policies
SELECT 'Test 5: RLS Policies' as test_name;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'friends')
ORDER BY tablename, policyname; 