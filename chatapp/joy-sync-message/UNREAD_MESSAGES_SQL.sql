-- ============================================================================
-- UNREAD MESSAGES TRACKING SYSTEM
-- ============================================================================
-- This adds unread message count tracking for better chat notifications
-- Run this in Supabase SQL Editor to enable message count notifications
-- ============================================================================

-- Step 1: Create message_read_status table to track read/unread messages
CREATE TABLE IF NOT EXISTS public.message_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (message_id, user_id)
);

-- Step 2: Create conversation_read_status table for tracking last read time per conversation
CREATE TABLE IF NOT EXISTS public.conversation_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    other_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, other_user_id)
);

-- Step 3: Enable Row Level Security
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_read_status ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for message_read_status
DROP POLICY IF EXISTS "message_read_status_select_policy" ON public.message_read_status;
CREATE POLICY "message_read_status_select_policy" ON public.message_read_status FOR SELECT USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "message_read_status_insert_policy" ON public.message_read_status;
CREATE POLICY "message_read_status_insert_policy" ON public.message_read_status FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "message_read_status_update_policy" ON public.message_read_status;
CREATE POLICY "message_read_status_update_policy" ON public.message_read_status FOR UPDATE USING (
    auth.uid() = user_id
);

-- Step 5: Create RLS policies for conversation_read_status
DROP POLICY IF EXISTS "conversation_read_status_select_policy" ON public.conversation_read_status;
CREATE POLICY "conversation_read_status_select_policy" ON public.conversation_read_status FOR SELECT USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "conversation_read_status_insert_policy" ON public.conversation_read_status;
CREATE POLICY "conversation_read_status_insert_policy" ON public.conversation_read_status FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "conversation_read_status_update_policy" ON public.conversation_read_status;
CREATE POLICY "conversation_read_status_update_policy" ON public.conversation_read_status FOR UPDATE USING (
    auth.uid() = user_id
);

-- Step 6: Create function to get unread message count for a user from another user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(sender_user_id UUID, receiver_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(m.id)::INTEGER
    FROM public.messages m
    LEFT JOIN public.conversation_read_status crs ON (
        crs.user_id = receiver_user_id 
        AND crs.other_user_id = sender_user_id
    )
    WHERE m.user_id = sender_user_id
    AND (
        crs.last_read_at IS NULL 
        OR m.created_at > crs.last_read_at
    )
    AND m.created_at > (current_timestamp - interval '7 days'); -- Only count messages from last 7 days
$$;

-- Step 7: Create function to mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(other_user_id UUID)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
AS $$
    INSERT INTO public.conversation_read_status (user_id, other_user_id, last_read_at, updated_at)
    VALUES (auth.uid(), other_user_id, now(), now())
    ON CONFLICT (user_id, other_user_id)
    DO UPDATE SET 
        last_read_at = now(),
        updated_at = now();
$$;

-- Step 8: Create function to get all unread counts for current user
CREATE OR REPLACE FUNCTION public.get_all_unread_counts()
RETURNS TABLE (
    sender_id UUID,
    unread_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        m.user_id as sender_id,
        COUNT(m.id)::INTEGER as unread_count
    FROM public.messages m
    LEFT JOIN public.conversation_read_status crs ON (
        crs.user_id = auth.uid() 
        AND crs.other_user_id = m.user_id
    )
    WHERE m.user_id != auth.uid()
    AND (
        crs.last_read_at IS NULL 
        OR m.created_at > crs.last_read_at
    )
    AND m.created_at > (current_timestamp - interval '7 days')
    GROUP BY m.user_id
    HAVING COUNT(m.id) > 0;
$$;

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON public.message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON public.message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_id ON public.conversation_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_other_user_id ON public.conversation_read_status(other_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id_created_at ON public.messages(user_id, created_at);

-- Step 10: Grant necessary permissions
GRANT ALL ON public.message_read_status TO authenticated;
GRANT ALL ON public.conversation_read_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_unread_counts() TO authenticated;

-- ============================================================================
-- UNREAD MESSAGE TRACKING ENABLED! 💬🔔
-- ============================================================================
-- After running this SQL:
-- 1. Refresh your app (F5)
-- 2. Unread message counts will appear on user profiles
-- 3. QuickChat will show accurate unread counts
-- 4. Message counts will update in real-time
-- ============================================================================ 