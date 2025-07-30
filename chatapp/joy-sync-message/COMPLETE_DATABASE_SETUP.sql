-- ============================================================================
-- COMPLETE DATABASE SETUP: Create All Tables and Features
-- ============================================================================
-- This script creates all necessary tables and features for the chat app
-- Run this in Supabase SQL Editor to fix the "messages table doesn't exist" error
-- ============================================================================

-- Step 1: Create profiles table first (required for foreign keys)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: Create messages table with all required columns
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'file')) DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id),
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Create message_likes table for tracking who liked what
CREATE TABLE IF NOT EXISTS public.message_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id) -- Prevent duplicate likes
);

-- Step 4: Create user_roles table for admin functionality
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(user_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON public.message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON public.message_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Step 6: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 8: Create RLS policies for messages
CREATE POLICY "messages_select_policy" ON public.messages 
FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = receiver_id OR 
    receiver_id IS NULL
);

CREATE POLICY "messages_insert_policy" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "messages_delete_policy" ON public.messages 
FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Create RLS policies for message_likes
CREATE POLICY "message_likes_select_policy" ON public.message_likes 
FOR SELECT USING (true);

CREATE POLICY "message_likes_insert_policy" ON public.message_likes 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "message_likes_delete_policy" ON public.message_likes 
FOR DELETE USING (auth.uid() = user_id);

-- Step 10: Create RLS policies for user_roles
CREATE POLICY "user_roles_select_policy" ON public.user_roles 
FOR SELECT USING (true);

CREATE POLICY "user_roles_insert_policy" ON public.user_roles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_update_policy" ON public.user_roles 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 11: Create function to toggle message like
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

-- Step 12: Create function to delete message (soft delete)
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

-- Step 13: Create function to get message likes
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

-- Step 14: Create function to mark conversation as read
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

-- Step 15: Create profiles for all existing users
INSERT INTO public.profiles (user_id, display_name)
SELECT 
    id, 
    COALESCE(
        raw_user_meta_data->>'display_name',
        raw_user_meta_data->>'name', 
        email,
        'User'
    ) as display_name
FROM auth.users 
ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(
        EXCLUDED.display_name,
        profiles.display_name,
        'User'
    );

-- Step 16: Grant all necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.message_likes TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_message_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID) TO authenticated;

-- Step 17: Create media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media',
    'chat-media', 
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- Step 18: Create storage policies
CREATE POLICY "chat_media_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

CREATE POLICY "chat_media_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-media');

-- Step 19: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SETUP COMPLETE! 🎉
-- ============================================================================
-- All tables created:
-- ✅ profiles table
-- ✅ messages table
-- ✅ message_likes table
-- ✅ user_roles table
-- ✅ All RLS policies
-- ✅ All database functions
-- ✅ Storage bucket and policies
-- ✅ Message deletion and liking features
-- ============================================================================ 