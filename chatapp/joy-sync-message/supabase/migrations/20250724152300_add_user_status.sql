-- Add online status and last seen functionality

-- Add columns to profiles table for user status
ALTER TABLE public.profiles 
ADD COLUMN is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to update user activity
CREATE OR REPLACE FUNCTION public.update_user_activity(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_online = TRUE,
    last_activity = now(),
    last_seen = now()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to set user offline
CREATE OR REPLACE FUNCTION public.set_user_offline(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_online = FALSE,
    last_seen = now()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to get user status
CREATE OR REPLACE FUNCTION public.get_user_status(user_uuid UUID)
RETURNS TABLE(
  is_online BOOLEAN,
  last_seen TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.is_online, p.last_seen, p.last_activity
  FROM public.profiles p
  WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update RLS policy to allow status updates
CREATE POLICY "Users can update their own status" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow everyone to see online status (for chat functionality)
CREATE POLICY "Everyone can view user status" 
ON public.profiles 
FOR SELECT 
USING (true); 