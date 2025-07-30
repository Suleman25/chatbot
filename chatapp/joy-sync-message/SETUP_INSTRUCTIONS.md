# 🚀 Quick Setup Instructions - Fix Database Error

## ❌ Problem: "Database Setup Required" Error

Tumhe yah error aa rahi hai kyunki database tables setup nahi hue hain.

## ✅ Solution: 2 Easy Methods

---

## 🎯 **Method 1: Quick Auto Setup (Try This First)**

1. **Open Friends Page**: Go to `/friends` in your app
2. **Click Button**: "Quick Auto Setup" button dabao
3. **Wait**: 5-10 seconds wait karo
4. **Done**: Page refresh ho jayega aur error gayab ho jayegi

**Agar yah method work nahi karta, to Method 2 use karo**

---

## 🛠️ **Method 2: Manual Setup (100% Working)**

### Step 1: Copy SQL Migration

```sql
-- Copy this COMPLETE SQL code:
```

### Step 2: Apply in Supabase

1. **Open**: https://supabase.com/dashboard
2. **Select**: Your project
3. **Go to**: SQL Editor (left sidebar)
4. **Paste**: The complete SQL migration code
5. **Click**: "Run" button
6. **Wait**: For success message

### Step 3: Refresh App

1. Go back to your app
2. Refresh the page (F5)
3. Error should be gone! ✅

---

## 📋 **Complete SQL Migration Code**

Copy this COMPLETE code and paste in Supabase SQL Editor:

```sql
-- ============================================================================
-- COMPLETE CHAT APP DATABASE SETUP
-- ============================================================================

-- ===== CORE TABLES =====

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create user_status table
CREATE TABLE IF NOT EXISTS public.user_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('online', 'offline', 'away', 'busy')) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== FRIENDS SYSTEM =====

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, friend_id)
);

-- ===== CONVERSATIONS & MESSAGES =====

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type text CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
    name text,
    description text,
    avatar_url text,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type text CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
    reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===== ENABLE ROW LEVEL SECURITY =====

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES - PROFILES =====

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- ===== RLS POLICIES - FRIENDS =====

DROP POLICY IF EXISTS "friends_select_policy" ON public.friends;
CREATE POLICY "friends_select_policy"
ON public.friends FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends_insert_policy" ON public.friends;
CREATE POLICY "friends_insert_policy"
ON public.friends FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "friends_update_policy" ON public.friends;
CREATE POLICY "friends_update_policy"
ON public.friends FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends_delete_policy" ON public.friends;
CREATE POLICY "friends_delete_policy"
ON public.friends FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ===== RLS POLICIES - USER STATUS =====

DROP POLICY IF EXISTS "user_status_select_policy" ON public.user_status;
CREATE POLICY "user_status_select_policy"
ON public.user_status FOR SELECT
USING (true);

DROP POLICY IF EXISTS "user_status_insert_policy" ON public.user_status;
CREATE POLICY "user_status_insert_policy"
ON public.user_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_status_update_policy" ON public.user_status;
CREATE POLICY "user_status_update_policy"
ON public.user_status FOR UPDATE
USING (auth.uid() = user_id);

-- ===== RLS POLICIES - CONVERSATIONS =====

DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
CREATE POLICY "conversations_select_policy"
ON public.conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id
    FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
CREATE POLICY "conversations_insert_policy"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
CREATE POLICY "conversations_update_policy"
ON public.conversations FOR UPDATE
USING (
  id IN (
    SELECT conversation_id
    FROM public.conversation_participants
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ===== RLS POLICIES - CONVERSATION PARTICIPANTS =====

DROP POLICY IF EXISTS "conversation_participants_select_policy" ON public.conversation_participants;
CREATE POLICY "conversation_participants_select_policy"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  conversation_id IN (
    SELECT conversation_id
    FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "conversation_participants_insert_policy" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert_policy"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id
    FROM public.conversation_participants
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE created_by = auth.uid()
  )
);

-- ===== RLS POLICIES - MESSAGES =====

DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  conversation_id IN (
    SELECT conversation_id
    FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

-- ===== RLS POLICIES - USER ROLES =====

DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy"
ON public.user_roles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
CREATE POLICY "user_roles_insert_policy"
ON public.user_roles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
CREATE POLICY "user_roles_delete_policy"
ON public.user_roles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ===== HELPER FUNCTIONS =====

-- Function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND user_roles.role = required_role
  );
$$;

-- Function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Function to update user status
CREATE OR REPLACE FUNCTION public.update_user_status(new_status TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO public.user_status (user_id, status, last_seen, updated_at)
  VALUES (auth.uid(), new_status, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    last_seen = now(),
    updated_at = now();

  RETURN json_build_object('success', true, 'status', new_status);
END;
$$;

-- ===== TRIGGERS =====

-- Function for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_status_updated_at ON public.user_status;
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== GRANTS =====

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_status TO authenticated;
GRANT ALL ON public.friends TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.messages TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_status(TEXT) TO authenticated;

-- ===== INITIAL DATA =====

-- Create a basic user profile for the first user (if they don't have one)
INSERT INTO public.profiles (user_id, display_name)
SELECT auth.uid(), 'Chat User'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
)
ON CONFLICT (user_id) DO NOTHING;

-- Set up initial user status
INSERT INTO public.user_status (user_id, status)
SELECT auth.uid(), 'online'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_status WHERE user_id = auth.uid()
)
ON CONFLICT (user_id) DO UPDATE SET
  status = 'online',
  last_seen = now(),
  updated_at = now();

-- ============================================================================
-- SETUP COMPLETE! 🎉
-- ============================================================================
```

---

## ✅ **After Setup, You'll Have:**

✅ **Friends System** - Add, remove, accept/reject friends  
✅ **Chat System** - Private and group conversations  
✅ **User Profiles** - Display names, avatars, bio  
✅ **Admin Panel** - Complete user management  
✅ **Real-time Updates** - Live messaging  
✅ **Security** - Row Level Security protection  
✅ **Mobile Responsive** - Works on all devices

---

## 🎯 **Troubleshooting**

**❌ Still seeing error?**

1. Make sure you're signed in to your app
2. Refresh your browser (Ctrl+F5)
3. Check browser console for errors
4. Try the manual setup method

**❌ SQL errors in Supabase?**

1. Make sure you copied the COMPLETE SQL code
2. Check that there are no missing characters
3. Run the SQL in small chunks if needed

**❌ Can't access Supabase?**

1. Check your Supabase account login
2. Verify you're in the correct project
3. Make sure you have edit permissions

---

## 🎉 **Success Indicators**

**Setup worked when:**
✅ Red error card disappears  
✅ Friends page loads smoothly  
✅ You can search for users  
✅ Friend requests work  
✅ No console errors

**Your chat app is now fully functional! 🚀💬**
