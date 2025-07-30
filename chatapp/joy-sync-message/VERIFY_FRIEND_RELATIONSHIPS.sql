-- ============================================================================
-- VERIFY FRIEND RELATIONSHIPS AND SUGGESTIONS LOGIC
-- ============================================================================
-- This script will verify the current state and test the suggestions logic
-- ============================================================================

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as step;

-- Check all profiles
SELECT 'All profiles:' as info;
SELECT user_id, display_name, email, is_admin FROM public.profiles ORDER BY display_name;

-- Check all friend relationships
SELECT 'All friend relationships:' as info;
SELECT 
    f.user_id,
    p1.display_name as user_name,
    f.friend_id,
    p2.display_name as friend_name,
    f.status,
    f.created_at
FROM public.friends f
JOIN public.profiles p1 ON f.user_id = p1.user_id
JOIN public.profiles p2 ON f.friend_id = p2.user_id
ORDER BY f.created_at DESC;

-- Step 2: Test suggestions logic for each user
SELECT '=== TESTING SUGGESTIONS LOGIC ===' as step;

-- Test for sam (admin user)
SELECT 'Suggestions for sam (admin):' as test_name;
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

-- Test for Jack
SELECT 'Suggestions for Jack:' as test_name;
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

-- Test for Marium
SELECT 'Suggestions for Marium:' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '4c296628-ed91-47c2-96db-14640269f17d'  -- Marium's user_id
AND p.user_id NOT IN (
    SELECT CASE 
        WHEN f.user_id = '4c296628-ed91-47c2-96db-14640269f17d' THEN f.friend_id
        ELSE f.user_id
    END
    FROM public.friends f
    WHERE (f.user_id = '4c296628-ed91-47c2-96db-14640269f17d' OR f.friend_id = '4c296628-ed91-47c2-96db-14640269f17d')
    AND f.status IN ('accepted', 'pending')
)
LIMIT 6;

-- Test for suleman
SELECT 'Suggestions for suleman:' as test_name;
SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
FROM public.profiles p
WHERE p.user_id != '033314da-63a8-4789-ab4d-8b1f51659342'  -- suleman's user_id
AND p.user_id NOT IN (
    SELECT CASE 
        WHEN f.user_id = '033314da-63a8-4789-ab4d-8b1f51659342' THEN f.friend_id
        ELSE f.user_id
    END
    FROM public.friends f
    WHERE (f.user_id = '033314da-63a8-4789-ab4d-8b1f51659342' OR f.friend_id = '033314da-63a8-4789-ab4d-8b1f51659342')
    AND f.status IN ('accepted', 'pending')
)
LIMIT 6;

-- Step 3: Show what each user should see
SELECT '=== WHAT EACH USER SHOULD SEE ===' as step;

-- For sam (admin): Should see Jack only (since Marium and suleman are friends, Jack has pending request)
SELECT 'sam should see:' as user, 'Jack only' as expected_suggestions;

-- For Jack: Should see Marium and suleman (since sam has pending request from Jack)
SELECT 'Jack should see:' as user, 'Marium and suleman' as expected_suggestions;

-- For Marium: Should see Jack and suleman (since sam is friend)
SELECT 'Marium should see:' as user, 'Jack and suleman' as expected_suggestions;

-- For suleman: Should see Jack and Marium (since sam is friend)
SELECT 'suleman should see:' as user, 'Jack and Marium' as expected_suggestions;

-- Step 4: Verify friend relationships are correct
SELECT '=== VERIFYING FRIEND RELATIONSHIPS ===' as step;

-- Check sam's relationships
SELECT 'sam relationships:' as user;
SELECT 
    CASE 
        WHEN f.user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' THEN p2.display_name
        ELSE p1.display_name
    END as friend_name,
    f.status
FROM public.friends f
JOIN public.profiles p1 ON f.user_id = p1.user_id
JOIN public.profiles p2 ON f.friend_id = p2.user_id
WHERE f.user_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6' OR f.friend_id = '3e40ef5f-d957-4374-9a90-a1570c7ee1d6';

-- Check Jack's relationships
SELECT 'Jack relationships:' as user;
SELECT 
    CASE 
        WHEN f.user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' THEN p2.display_name
        ELSE p1.display_name
    END as friend_name,
    f.status
FROM public.friends f
JOIN public.profiles p1 ON f.user_id = p1.user_id
JOIN public.profiles p2 ON f.friend_id = p2.user_id
WHERE f.user_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b' OR f.friend_id = '6cc043e9-a56c-40a2-9504-46265dc7f36b'; 