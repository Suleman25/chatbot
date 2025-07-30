-- Set specific user as admin by email
-- Make sulemanjamil177@gmail.com the admin user

-- First, remove existing admin role if any
DELETE FROM public.user_roles WHERE role = 'admin';

-- Set the specific user as admin based on email
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
INNER JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'sulemanjamil177@gmail.com';

-- If user doesn't exist yet, we'll add a function to set admin on first login
CREATE OR REPLACE FUNCTION public.set_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'sulemanjamil177@gmail.com' THEN
    -- Set as admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Set as regular user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_admin_on_auth_user_created ON auth.users;

-- Create new trigger for admin setup
CREATE TRIGGER set_admin_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_on_signup(); 