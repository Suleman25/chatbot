-- Rename messeges table to messages and update schema
ALTER TABLE public.messeges RENAME TO messages;

-- Rename sender column to user_id to match your code
ALTER TABLE public.messages RENAME COLUMN sender TO user_id;

-- Add id column for primary key
ALTER TABLE public.messages ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
-- Users can insert their own messages
CREATE POLICY "Users can insert their own messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Only admins can view all messages
CREATE POLICY "Admins can view all messages" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = user_id);