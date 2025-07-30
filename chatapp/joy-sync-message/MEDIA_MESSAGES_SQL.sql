-- ============================================================================
-- MEDIA MESSAGES: IMAGE & VIDEO SUPPORT - FIXED BUCKET ISSUE
-- ============================================================================
-- This fixes the bucket not found issue and adds image/video sharing functionality
-- Run this in Supabase SQL Editor to enable media sharing
-- ============================================================================

-- Step 1: Update messages table to support different message types
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'file')) DEFAULT 'text';

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Step 2: Create storage bucket for chat media files (FIXED VERSION)
-- First, ensure the bucket exists or create it
DO $$
BEGIN
    -- Try to create the bucket, ignore if it already exists
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'chat-media',
        'chat-media',
        true,
        52428800, -- 50MB limit
        ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
    ) ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 52428800,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
EXCEPTION 
    WHEN others THEN
        -- If bucket creation fails, just update the existing one
        UPDATE storage.buckets SET
            public = true,
            file_size_limit = 52428800,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
        WHERE id = 'chat-media';
END $$;

-- Step 3: Create storage policies for chat media (FIXED VERSION)
-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Create new policies
CREATE POLICY "chat_media_upload_policy" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "chat_media_view_policy" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'chat-media');

CREATE POLICY "chat_media_delete_policy" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'chat-media' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_file_url ON public.messages(file_url) WHERE file_url IS NOT NULL;

-- Step 5: Create function to clean up orphaned media files
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_media()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete storage objects that don't have corresponding messages
    DELETE FROM storage.objects 
    WHERE bucket_id = 'chat-media' 
    AND name NOT IN (
        SELECT SUBSTRING(file_url FROM 'chat-media/(.+)$') 
        FROM public.messages 
        WHERE file_url IS NOT NULL
        AND file_url LIKE '%chat-media/%'
    );
END;
$$;

-- Step 6: Create trigger to clean up media when message is deleted
CREATE OR REPLACE FUNCTION public.cleanup_message_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete associated media file when message is deleted
    IF OLD.file_url IS NOT NULL AND OLD.file_url LIKE '%chat-media/%' THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'chat-media' 
        AND name = SUBSTRING(OLD.file_url FROM 'chat-media/(.+)$');
    END IF;
    RETURN OLD;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS cleanup_message_media_trigger ON public.messages;
CREATE TRIGGER cleanup_message_media_trigger
    AFTER DELETE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_message_media();

-- Step 7: Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_media() TO authenticated;

-- Step 8: Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MEDIA MESSAGES ENABLED! 📸🎥 (BUCKET ISSUE FIXED)
-- ============================================================================
-- After running this SQL:
-- 1. Refresh your app (F5)
-- 2. Images and videos will upload properly (no bucket errors)
-- 3. Media files are stored securely in Supabase Storage
-- 4. Automatic cleanup when messages are deleted
-- ============================================================================ 