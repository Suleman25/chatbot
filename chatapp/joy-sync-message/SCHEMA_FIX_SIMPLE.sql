-- ============================================================================
-- SIMPLE SCHEMA FIX: Fix Foreign Key Relationship Errors
-- ============================================================================
-- This is a simplified fix for the "Could not find a relationship" error
-- Run this in Supabase SQL Editor if you're getting foreign key errors
-- ============================================================================

-- Step 1: Ensure both tables exist with minimal structure
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Simple policies
DROP POLICY IF EXISTS "messages_policy" ON public.messages;
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;

CREATE POLICY "messages_policy" ON public.messages 
FOR ALL USING (
    auth.uid() = user_id OR 
    auth.uid() = receiver_id OR 
    receiver_id IS NULL
);

CREATE POLICY "profiles_policy" ON public.profiles 
FOR ALL USING (true);

-- Step 4: Basic indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

-- Step 5: Grant permissions
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Step 6: Create profiles for existing users
INSERT INTO public.profiles (user_id, display_name)
SELECT id, email FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Step 7: Refresh schema
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SIMPLE FIX COMPLETE! 🚀
-- ============================================================================
-- This should resolve the foreign key relationship errors
-- If you still get errors, your database might need the full SIMPLE_MESSAGES_FIX.sql
-- ============================================================================ 