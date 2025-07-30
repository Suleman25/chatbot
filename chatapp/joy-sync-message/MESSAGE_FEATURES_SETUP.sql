-- ============================================================================
-- MESSAGE FEATURES SETUP: Add Delete and Like Features
-- ============================================================================
-- This script adds message deletion and liking capabilities
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add new columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Step 2: Create message_likes table for tracking who liked what
CREATE TABLE IF NOT EXISTS public.message_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id) -- Prevent duplicate likes
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON public.message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON public.message_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);

-- Step 4: Enable RLS on message_likes table
ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for message_likes
CREATE POLICY "message_likes_select_policy" ON public.message_likes 
FOR SELECT USING (true);

CREATE POLICY "message_likes_insert_policy" ON public.message_likes 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "message_likes_delete_policy" ON public.message_likes 
FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Update messages table RLS policies to include deletion
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages 
FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    )
) WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    )
);

-- Step 7: Create function to toggle message like
CREATE OR REPLACE FUNCTION public.toggle_message_like(message_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_like BOOLEAN;
    new_like_count INTEGER;
BEGIN
    -- Check if user already liked this message
    SELECT EXISTS(
        SELECT 1 FROM public.message_likes 
        WHERE message_id = message_uuid AND user_id = auth.uid()
    ) INTO existing_like;
    
    IF existing_like THEN
        -- Remove like
        DELETE FROM public.message_likes 
        WHERE message_id = message_uuid AND user_id = auth.uid();
        
        -- Update like count
        UPDATE public.messages 
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = message_uuid;
        
        RETURN FALSE; -- Like removed
    ELSE
        -- Add like
        INSERT INTO public.message_likes (message_id, user_id)
        VALUES (message_uuid, auth.uid());
        
        -- Update like count
        UPDATE public.messages 
        SET like_count = like_count + 1
        WHERE id = message_uuid;
        
        RETURN TRUE; -- Like added
    END IF;
END;
$$;

-- Step 8: Create function to delete message (soft delete)
CREATE OR REPLACE FUNCTION public.delete_message(message_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    message_user_id UUID;
    is_admin_user BOOLEAN;
BEGIN
    -- Get message owner
    SELECT user_id INTO message_user_id 
    FROM public.messages 
    WHERE id = message_uuid;
    
    -- Check if current user is admin
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
    ) INTO is_admin_user;
    
    -- Allow deletion if user owns the message or is admin
    IF message_user_id = auth.uid() OR is_admin_user THEN
        UPDATE public.messages 
        SET 
            is_deleted = TRUE,
            deleted_at = now(),
            deleted_by = auth.uid()
        WHERE id = message_uuid;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Step 9: Create function to get message likes
CREATE OR REPLACE FUNCTION public.get_message_likes(message_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.user_id,
        COALESCE(p.display_name, 'Unknown User')::TEXT,
        ml.created_at
    FROM public.message_likes ml
    LEFT JOIN public.profiles p ON ml.user_id = p.user_id
    WHERE ml.message_id = message_uuid
    ORDER BY ml.created_at ASC;
END;
$$;

-- Step 10: Grant permissions
GRANT ALL ON public.message_likes TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_message_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_likes(UUID) TO authenticated;

-- Step 11: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SETUP COMPLETE! 🎉
-- ============================================================================
-- Features added:
-- ✅ Message deletion (soft delete)
-- ✅ Message liking/unliking
-- ✅ Like count tracking
-- ✅ Admin can delete any message
-- ✅ Users can delete their own messages
-- ✅ Users can like/unlike any message
-- ============================================================================ 