-- ============================================================================
-- FIX MISSING COLUMNS: Add Missing Columns to Messages Table
-- ============================================================================
-- This script adds the missing columns that are causing the error
-- Run this in Supabase SQL Editor to fix the "column does not exist" error
-- ============================================================================

-- Step 1: Add missing columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Step 2: Create message_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.message_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id) -- Prevent duplicate likes
);

-- Step 3: Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Step 4: Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON public.message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON public.message_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Step 6: Enable RLS on new tables
ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for message_likes
DROP POLICY IF EXISTS "message_likes_select_policy" ON public.message_likes;
CREATE POLICY "message_likes_select_policy" ON public.message_likes 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "message_likes_insert_policy" ON public.message_likes;
CREATE POLICY "message_likes_insert_policy" ON public.message_likes 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "message_likes_delete_policy" ON public.message_likes;
CREATE POLICY "message_likes_delete_policy" ON public.message_likes 
FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create RLS policies for user_roles
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" ON public.user_roles 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_insert_policy" ON public.user_roles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
CREATE POLICY "user_roles_update_policy" ON public.user_roles 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 9: Update messages table RLS policies to include deletion
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

-- Step 10: Create function to toggle message like
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

-- Step 11: Create function to delete message (soft delete)
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

-- Step 12: Create function to get message likes
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

-- Step 13: Create function to mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(other_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function can be expanded later to mark messages as read
    -- For now, it just validates the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
END;
$$;

-- Step 14: Grant permissions
GRANT ALL ON public.message_likes TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_message_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID) TO authenticated;

-- Step 15: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIX COMPLETE! 🎉
-- ============================================================================
-- Missing columns added:
-- ✅ is_deleted column to messages table
-- ✅ deleted_at column to messages table
-- ✅ deleted_by column to messages table
-- ✅ like_count column to messages table
-- ✅ is_admin column to profiles table
-- ✅ message_likes table created
-- ✅ user_roles table created
-- ✅ All functions and policies created
-- ============================================================================ 