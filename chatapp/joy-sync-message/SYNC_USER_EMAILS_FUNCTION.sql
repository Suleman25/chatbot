-- Function to sync user emails from auth.users to profiles table
-- This ensures emails are always up to date

CREATE OR REPLACE FUNCTION sync_user_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profiles with real emails from auth.users
  UPDATE profiles 
  SET email = auth_users.email
  FROM (
    SELECT id, email 
    FROM auth.users 
    WHERE email IS NOT NULL
  ) AS auth_users
  WHERE profiles.user_id = auth_users.id::text
  AND (profiles.email IS NULL OR profiles.email = '' OR profiles.email LIKE '%@example.com');
  
  RAISE NOTICE 'User emails synced successfully';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_user_emails() TO authenticated;

-- Create a trigger to automatically sync emails when profiles are inserted
CREATE OR REPLACE FUNCTION trigger_sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get email from auth.users for the new profile
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id::text = NEW.user_id
  AND email IS NOT NULL;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_user_email_trigger ON profiles;
CREATE TRIGGER sync_user_email_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_user_email();

-- Test the function
SELECT sync_user_emails(); 