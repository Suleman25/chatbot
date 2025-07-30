-- ============================================================================
-- FIX USER PROFILES FOR MESSAGES: Ensure All Users Have Proper Names
-- ============================================================================
-- This script will fix the "Unknown User" issue in messages
-- ============================================================================

-- Step 1: Disable RLS temporarily to ensure we can update all profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Add email column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 3: Clear existing profiles to start fresh
DELETE FROM public.profiles;

-- Step 4: Insert ALL 4 users with their correct names and emails
INSERT INTO public.profiles (user_id, display_name, email, created_at, is_admin) VALUES
-- User 1: Jack
('6cc043e9-a56c-40a2-9504-46265dc7f36b', 'Jack', 'vopoh47826@kloudis.com', NOW(), false),
-- User 2: Marium  
('4c296628-ed91-47c2-96db-14640269f17d', 'Marium', 'mariummansoori18@gmail.com', NOW(), false),
-- User 3: suleman
('033314da-63a8-4789-ab4d-8b1f51659342', 'suleman', 'sulemanjamil05@gmail.com', NOW(), false),
-- User 4: sam (Admin)
('3e40ef5f-d957-4374-9a90-a1570c7ee1d6', 'sam', 'sulemanjamil177@gmail.com', NOW(), true);

-- Step 5: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Update RLS policies to allow proper access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy that allows users to view all profiles (needed for messages)
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

-- Create policy that allows users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Create policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 7: Ensure messages table has proper structure
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id),
    like_count INTEGER DEFAULT 0,
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(user_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Step 9: Set up RLS for messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- Create policies for messages
CREATE POLICY "Users can view messages" ON public.messages
    FOR SELECT USING (
        user_id = auth.uid() OR receiver_id = auth.uid()
    );

CREATE POLICY "Users can insert messages" ON public.messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own messages" ON public.messages
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE USING (user_id = auth.uid());

-- Step 10: Create function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(other_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.messages
    SET read_at = NOW()
    WHERE user_id = other_user_id 
    AND receiver_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Step 11: Verify all users are properly set up
SELECT 
    'VERIFICATION: All users added to profiles' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.profiles;

-- Step 12: Show detailed list of all users
SELECT 
    user_id,
    display_name,
    email,
    is_admin,
    created_at
FROM public.profiles 
ORDER BY created_at DESC;

-- Step 13: Show any existing messages with user info
SELECT 
    m.id,
    m.content,
    m.user_id,
    m.receiver_id,
    p.display_name as sender_name,
    m.created_at
FROM public.messages m
LEFT JOIN public.profiles p ON m.user_id = p.user_id
ORDER BY m.created_at DESC
LIMIT 10; 