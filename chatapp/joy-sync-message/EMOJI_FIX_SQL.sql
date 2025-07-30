-- ============================================================================
-- EMOJI FIX: MESSAGES TABLE WITH PROPER UTF-8 SUPPORT
-- ============================================================================
-- This fixes emoji display issues in chat messages
-- Run this in Supabase SQL Editor to enable full emoji support
-- ============================================================================

-- Step 1: Create messages table with proper UTF-8 encoding for emojis
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Ensure proper UTF-8 encoding for emoji support
-- PostgreSQL uses UTF-8 by default, but let's ensure it's configured correctly
ALTER DATABASE postgres SET client_encoding TO 'UTF8';

-- Step 3: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Step 4: Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create security policies for messages
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages FOR SELECT USING (
    auth.uid() IS NOT NULL  -- Any authenticated user can read messages
);

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = user_id    -- Users can only insert their own messages
);

DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages FOR UPDATE USING (
    auth.uid() = user_id    -- Users can only edit their own messages
);

DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages FOR DELETE USING (
    auth.uid() = user_id OR   -- Users can delete their own messages
    EXISTS (                  -- OR admins can delete any message
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Step 6: Grant proper permissions
GRANT ALL ON public.messages TO authenticated;
GRANT USAGE ON SEQUENCE messages_id_seq TO authenticated;

-- Step 7: Test emoji support with a sample message (optional)
-- INSERT INTO public.messages (content, user_id) 
-- VALUES ('Test emoji message: 😀 🎉 🚀 💖 🔥 ✨', auth.uid());

-- ============================================================================
-- EMOJI SUPPORT ENABLED! 🎉
-- ============================================================================
-- After running this SQL:
-- 1. Refresh your app (F5)
-- 2. Try sending messages with emojis: 😀 🎉 🚀 💖
-- 3. Emojis should now display and send perfectly!
-- ============================================================================ 