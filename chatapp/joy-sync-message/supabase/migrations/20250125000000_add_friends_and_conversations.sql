-- Add friends/contacts system and private conversations
-- Create friends table for user relationships
CREATE TABLE public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- Create conversations table for private chats
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type text CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
    name text,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

-- Update messages table to link to conversations
ALTER TABLE public.messages ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for friends table
CREATE POLICY "Users can view their own friends and friend requests" 
ON public.friends 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can manage their own friend relationships" 
ON public.friends 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for conversations
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = conversations.id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation creators can update conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = created_by);

-- RLS policies for conversation_participants
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp2
        WHERE cp2.conversation_id = conversation_participants.conversation_id 
        AND cp2.user_id = auth.uid()
    )
);

CREATE POLICY "Users can join conversations they're invited to" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations" 
ON public.conversation_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update messages RLS policies for conversation-based messaging
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
    -- Allow if user is participant in the conversation
    (conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = messages.conversation_id 
        AND user_id = auth.uid()
    ))
    OR
    -- Allow admins to view all messages (backward compatibility)
    (conversation_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can send messages to their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
    -- Allow if user is participant in the conversation
    (conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = messages.conversation_id 
        AND user_id = auth.uid()
    ))
    OR
    -- Allow admins to send messages (backward compatibility)
    (conversation_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_friends_updated_at
    BEFORE UPDATE ON public.friends
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column(); 

-- Create function to get or create direct conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Try to find existing direct conversation between these users
    SELECT c.id INTO conversation_id
    FROM public.conversations c
    WHERE c.type = 'direct'
    AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp1 
        WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp2 
        WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
    )
    AND (
        SELECT COUNT(*) FROM public.conversation_participants cp 
        WHERE cp.conversation_id = c.id
    ) = 2;

    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO public.conversations (type, created_by)
        VALUES ('direct', user1_id)
        RETURNING id INTO conversation_id;

        -- Add both users as participants
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (conversation_id, user1_id), (conversation_id, user2_id);
    END IF;

    RETURN conversation_id;
END;
$$; 