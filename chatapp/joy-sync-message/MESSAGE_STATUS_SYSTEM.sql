-- ============================================================================
-- MESSAGE STATUS SYSTEM FOR RABITAHUB
-- ============================================================================
-- This script implements WhatsApp-style message status functionality
-- including sent, delivered, and read status with unread message counts
-- ============================================================================

-- Add status columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create message_status table for tracking status changes
CREATE TABLE IF NOT EXISTS public.message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('sent', 'delivered', 'read')) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation_read_status table for tracking read status
CREATE TABLE IF NOT EXISTS public.conversation_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    conversation_partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, conversation_partner_id)
);

-- Enable RLS on new tables
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_status
CREATE POLICY "message_status_select_policy" 
ON public.message_status FOR SELECT 
USING (auth.uid() IN (
    SELECT user_id FROM public.messages WHERE id = message_id
    UNION
    SELECT receiver_id FROM public.messages WHERE id = message_id
));

CREATE POLICY "message_status_insert_policy" 
ON public.message_status FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.messages WHERE id = message_id
    UNION
    SELECT receiver_id FROM public.messages WHERE id = message_id
));

-- RLS Policies for conversation_read_status
CREATE POLICY "conversation_read_status_select_policy" 
ON public.conversation_read_status FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = conversation_partner_id);

CREATE POLICY "conversation_read_status_insert_policy" 
ON public.conversation_read_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversation_read_status_update_policy" 
ON public.conversation_read_status FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to mark message as delivered
CREATE OR REPLACE FUNCTION public.mark_message_delivered(message_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update message delivered_at
    UPDATE public.messages 
    SET delivered_at = now() 
    WHERE id = message_id AND delivered_at IS NULL;
    
    -- Insert status record
    INSERT INTO public.message_status (message_id, status)
    VALUES (message_id, 'delivered');
    
    RETURN json_build_object('success', true, 'status', 'delivered');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to mark message as read
CREATE OR REPLACE FUNCTION public.mark_message_read(message_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update message read_at
    UPDATE public.messages 
    SET read_at = now() 
    WHERE id = message_id AND read_at IS NULL;
    
    -- Insert status record
    INSERT INTO public.message_status (message_id, status)
    VALUES (message_id, 'read');
    
    RETURN json_build_object('success', true, 'status', 'read');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(partner_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Mark all unread messages from this partner as read
    UPDATE public.messages 
    SET read_at = now() 
    WHERE user_id = partner_id 
    AND receiver_id = current_user_id 
    AND read_at IS NULL;
    
    -- Update or insert conversation read status
    INSERT INTO public.conversation_read_status (user_id, conversation_partner_id, last_read_at)
    VALUES (current_user_id, partner_id, now())
    ON CONFLICT (user_id, conversation_partner_id) 
    DO UPDATE SET last_read_at = now(), updated_at = now();
    
    RETURN json_build_object('success', true, 'messages_marked_read', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer
    FROM public.messages 
    WHERE receiver_id = auth.uid() 
    AND read_at IS NULL;
$$;

-- Function to get conversation unread count
CREATE OR REPLACE FUNCTION public.get_conversation_unread_count(partner_id UUID)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer
    FROM public.messages 
    WHERE user_id = partner_id 
    AND receiver_id = auth.uid() 
    AND read_at IS NULL;
$$;

-- Function to get message status
CREATE OR REPLACE FUNCTION public.get_message_status(message_id UUID)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE 
            WHEN read_at IS NOT NULL THEN 'read'
            WHEN delivered_at IS NOT NULL THEN 'delivered'
            ELSE 'sent'
        END
    FROM public.messages 
    WHERE id = message_id;
$$;

-- Trigger to automatically mark messages as delivered when viewed
CREATE OR REPLACE FUNCTION public.auto_mark_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark message as delivered when receiver views it
    IF NEW.delivered_at IS NULL AND NEW.receiver_id = auth.uid() THEN
        NEW.delivered_at = now();
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for auto-delivery
DROP TRIGGER IF EXISTS trigger_auto_mark_delivered ON public.messages;
CREATE TRIGGER trigger_auto_mark_delivered
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_mark_delivered();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_message_delivered(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_message_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_status(UUID) TO authenticated;

-- Grant table permissions
GRANT ALL ON public.message_status TO authenticated;
GRANT ALL ON public.conversation_read_status TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON public.messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON public.message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_partner ON public.conversation_read_status(user_id, conversation_partner_id);

-- ============================================================================
-- MESSAGE STATUS SYSTEM SETUP COMPLETE
-- ============================================================================
-- Features implemented:
-- ✅ Message delivery tracking (delivered_at)
-- ✅ Message read tracking (read_at)
-- ✅ Message status history (message_status table)
-- ✅ Conversation read status (conversation_read_status table)
-- ✅ Unread message counting
-- ✅ WhatsApp-style status indicators
-- ✅ Automatic delivery marking
-- ✅ RLS security policies
-- ✅ Performance indexes
-- ============================================================================ 