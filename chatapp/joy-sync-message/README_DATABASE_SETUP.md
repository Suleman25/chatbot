# 🗃️ Friends System Database Setup Guide

## 📋 Overview

This guide will help you set up the complete friends system database for Joy Sync Chat. If you're seeing "Database Configuration Error - Friends table is not accessible", follow these steps.

## 🚀 Quick Setup (Recommended)

### Step 1: Apply Migration

The easiest way is to apply the comprehensive friends system migration:

1. **Open Supabase Dashboard**: Go to your project dashboard
2. **Navigate to SQL Editor**: Click on "SQL Editor" in the left sidebar
3. **Run Migration**: Copy and paste the contents of `supabase/migrations/20250724170000_ensure_friends_system.sql`
4. **Execute**: Click "Run" to apply the migration

### Step 2: Verify Setup

After running the migration, verify everything is working:

1. **Go to Friends Page**: Navigate to `/friends` in your app
2. **Open Debug Panel**: Look for the blue debug panel at the top (development mode only)
3. **Click "Test Friends"**: This will run a 6-step verification process
4. **Expected Result**: You should see "Friends System Test PASSED ✅"

---

## 🔧 Manual Setup (If Migration Fails)

If the automatic migration doesn't work, follow these manual steps:

### 1. Create Friends Table

```sql
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, friend_id)
);
```

### 2. Create Profiles Table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 3. Enable Row Level Security

```sql
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### 4. Create RLS Policies

#### Friends Table Policies:

```sql
-- Allow users to view their own friends and friend requests
CREATE POLICY "friends_select_policy"
ON public.friends
FOR SELECT
USING (
    auth.uid() = user_id OR
    auth.uid() = friend_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to create friend requests
CREATE POLICY "friends_insert_policy"
ON public.friends
FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to update their friend relationships
CREATE POLICY "friends_update_policy"
ON public.friends
FOR UPDATE
USING (
    auth.uid() = user_id OR
    auth.uid() = friend_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to delete their friend relationships
CREATE POLICY "friends_delete_policy"
ON public.friends
FOR DELETE
USING (
    auth.uid() = user_id OR
    auth.uid() = friend_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);
```

#### Profiles Table Policies:

```sql
-- Allow all users to view profiles (needed for friends system)
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (true);

-- Allow users to create their own profile
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to delete their own profile
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin'::app_role)
);
```

### 5. Create Helper Functions

```sql
-- Send friend request function
CREATE OR REPLACE FUNCTION public.send_friend_request(friend_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    existing_friendship_id UUID;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF current_user_id = friend_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot send friend request to yourself');
    END IF;

    SELECT id INTO existing_friendship_id
    FROM public.friends
    WHERE (user_id = current_user_id AND friend_id = friend_user_id)
       OR (user_id = friend_user_id AND friend_id = current_user_id);

    IF existing_friendship_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'Friendship already exists or request already sent');
    END IF;

    INSERT INTO public.friends (user_id, friend_id, status)
    VALUES (current_user_id, friend_user_id, 'pending');

    RETURN json_build_object('success', true, 'message', 'Friend request sent successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

_Continue with accept_friend_request, reject_friend_request, and remove_friend functions from the migration file..._

### 6. Grant Permissions

```sql
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
-- Add other function grants...
```

---

## 🧪 Testing & Verification

### Using Debug Panel

1. **Enable Development Mode**: Make sure you're running `npm run dev`
2. **Navigate to Friends**: Go to `/friends` page
3. **Find Debug Panel**: Look for blue panel at top of page
4. **Run Tests**:
   - **"Test Friends"**: Comprehensive 6-step test
   - **"Test DB"**: Basic database connection
   - **"Refresh Friends"**: Reset friends data

### Expected Test Results

#### ✅ Successful Test Output:

```
🎉 Friends System Test PASSED
✅ All tests passed! 0 friends, 0 requests
```

#### ❌ Common Error Messages:

1. **"Friends table is not accessible"**

   - **Solution**: Run the migration or create tables manually
   - **Cause**: Tables don't exist or RLS policies are blocking access

2. **"Permission denied"**

   - **Solution**: Check RLS policies, ensure proper authentication
   - **Cause**: RLS policies are too restrictive

3. **"Network timeout"**
   - **Solution**: Check internet connection, Supabase status
   - **Cause**: Network connectivity issues

---

## 🔍 Troubleshooting

### Issue: "Friends System Test Failed"

#### Check 1: Table Existence

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('friends', 'profiles');
```

#### Check 2: RLS Policies

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('friends', 'profiles');
```

#### Check 3: Function Existence

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%friend%';
```

### Issue: Authentication Problems

1. **Sign out and sign back in**
2. **Clear browser cache/storage**
3. **Check Supabase auth configuration**

### Issue: Performance Problems

1. **Add database indexes** (if many users):

```sql
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);
```

---

## 📚 Friends System Features

Once set up, your friends system will support:

### ✅ Core Features:

- **Send Friend Requests**: Users can send requests to each other
- **Accept/Reject Requests**: Recipients can accept or reject requests
- **Friends List**: View all accepted friends
- **Remove Friends**: Users can remove friends from their list
- **Search Users**: Find other users to add as friends
- **Real-time Updates**: Friends list updates automatically

### 🛡️ Security Features:

- **Row Level Security**: Users can only see their own data
- **Input Validation**: All inputs are validated and sanitized
- **Duplicate Prevention**: Can't send multiple requests to same user
- **Self-Request Prevention**: Can't send friend requests to yourself
- **Admin Override**: Admins can manage all friendships

### 🎯 User Experience:

- **Instant Feedback**: Toast notifications for all actions
- **Loading States**: Clear loading indicators
- **Error Handling**: Helpful error messages
- **Retry Logic**: Automatic retry for network issues
- **Debug Tools**: Comprehensive debugging in development mode

---

## 🎉 Success Indicators

You'll know everything is working when:

1. **Debug Panel Shows**: "Friends System Test PASSED ✅"
2. **No Error Messages**: No red error toasts appearing
3. **Smooth Navigation**: Friends page loads without issues
4. **Functional Buttons**: All friend actions work (add, accept, reject, remove)
5. **Real-time Updates**: Changes appear immediately

---

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check Console**: Open browser dev tools, look for detailed error logs
2. **Verify Supabase**: Ensure your Supabase project is running and accessible
3. **Check Environment**: Verify your `.env` file has correct Supabase credentials
4. **Contact Support**: Provide debug panel test results and console error logs

---

**Happy chatting! 🎯✨**
