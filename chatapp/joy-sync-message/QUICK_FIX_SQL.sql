-- ============================================================================
-- QUICK FIX: FRIENDS TABLE SETUP (Copy & Paste in Supabase SQL Editor)
-- ============================================================================

-- Step 1: Create basic tables
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- Step 2: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- Step 3: Enable security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security policies
-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Friends policies
DROP POLICY IF EXISTS "friends_select_policy" ON public.friends;
CREATE POLICY "friends_select_policy" ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends_insert_policy" ON public.friends;
CREATE POLICY "friends_insert_policy" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "friends_update_policy" ON public.friends;
CREATE POLICY "friends_update_policy" ON public.friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends_delete_policy" ON public.friends;
CREATE POLICY "friends_delete_policy" ON public.friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Step 5: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.friends TO authenticated;

-- ============================================================================
-- SETUP COMPLETE! 🎉
-- ============================================================================
-- After running this SQL:
-- 1. Go back to your app
-- 2. Refresh the page (F5) 
-- 3. The "Friends table not found" error should be gone!
-- 4. Friends system will work perfectly!
-- ============================================================================ 