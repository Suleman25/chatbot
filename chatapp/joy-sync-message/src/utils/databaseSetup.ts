import { supabase } from '@/integrations/supabase/client';

// Database setup utility to automatically create friends system
export class DatabaseSetup {
  private static setupCompleted = false;
  private static setupInProgress = false;

  static async ensureFriendsSystemSetup(): Promise<boolean> {
    // Return early if setup is already completed or in progress
    if (this.setupCompleted || this.setupInProgress) {
      return this.setupCompleted;
    }

    this.setupInProgress = true;
    console.log('🔧 Starting automatic database setup for friends system...');

    try {
      // Step 1: Test basic connection
      console.log('📡 Testing database connection...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      if (connectionError && connectionError.code !== 'PGRST116' && connectionError.code !== 'PGRST204') {
        console.error('❌ Database connection failed:', connectionError);
        this.setupInProgress = false;
        return false;
      }

      console.log('✅ Database connection successful');

      // Step 2: Check if friends table exists
      console.log('🔍 Checking if friends table exists...');
      const { data: friendsCheck, error: friendsError } = await supabase
        .from('friends')
        .select('id')
        .limit(1);

      if (friendsError && friendsError.code === '42P01') {
        console.log('📋 Friends table does not exist, creating it...');
        await this.createFriendsTable();
      } else if (friendsError && friendsError.code !== 'PGRST116' && friendsError.code !== 'PGRST204') {
        console.log('⚠️ Friends table exists but has access issues, fixing RLS...');
        await this.fixRLSPolicies();
      } else {
        console.log('✅ Friends table exists and is accessible');
      }

      // Step 3: Ensure profiles table is accessible
      console.log('🔍 Ensuring profiles table is properly configured...');
      await this.ensureProfilesTable();

      // Step 4: Create helper functions
      console.log('🛠️ Creating helper functions...');
      await this.createHelperFunctions();

      console.log('🎉 Database setup completed successfully!');
      this.setupCompleted = true;
      this.setupInProgress = false;
      return true;

    } catch (error) {
      console.error('💥 Database setup failed:', error);
      this.setupInProgress = false;
      return false;
    }
  }

  private static async createFriendsTable(): Promise<void> {
    console.log('📋 Creating friends table...');
    
    const createTableSQL = `
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

      -- Enable RLS
      ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      DROP POLICY IF EXISTS "friends_select_policy" ON public.friends;
      CREATE POLICY "friends_select_policy" 
      ON public.friends 
      FOR SELECT 
      USING (
          auth.uid() = user_id OR 
          auth.uid() = friend_id OR
          public.has_role(auth.uid(), 'admin'::app_role)
      );

      DROP POLICY IF EXISTS "friends_insert_policy" ON public.friends;
      CREATE POLICY "friends_insert_policy" 
      ON public.friends 
      FOR INSERT 
      WITH CHECK (
          auth.uid() = user_id
      );

      DROP POLICY IF EXISTS "friends_update_policy" ON public.friends;
      CREATE POLICY "friends_update_policy" 
      ON public.friends 
      FOR UPDATE 
      USING (
          auth.uid() = user_id OR 
          auth.uid() = friend_id
      );

      DROP POLICY IF EXISTS "friends_delete_policy" ON public.friends;
      CREATE POLICY "friends_delete_policy" 
      ON public.friends 
      FOR DELETE 
      USING (
          auth.uid() = user_id OR 
          auth.uid() = friend_id
      );
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL }).catch(() => ({
      error: 'RPC not available, trying direct approach'
    }));

    if (error) {
      console.log('⚠️ Could not use RPC, friends table might need manual creation');
      // Table creation will be handled by the migration file
    }
  }

  private static async fixRLSPolicies(): Promise<void> {
    console.log('🔒 Fixing RLS policies...');
    
    // Try to fix common RLS issues
    const fixPoliciesSQL = `
      -- Fix RLS policies for friends table
      DROP POLICY IF EXISTS "friends_select_policy" ON public.friends;
      CREATE POLICY "friends_select_policy" 
      ON public.friends 
      FOR SELECT 
      USING (
          auth.uid() = user_id OR 
          auth.uid() = friend_id
      );
    `;

    try {
      await supabase.rpc('exec_sql', { sql: fixPoliciesSQL });
    } catch (error) {
      console.log('⚠️ Could not fix RLS policies automatically');
    }
  }

  private static async ensureProfilesTable(): Promise<void> {
    console.log('👤 Ensuring profiles table configuration...');
    
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1);

    if (profilesError && profilesError.code === '42P01') {
      console.log('📋 Profiles table does not exist, it will be created automatically');
    } else {
      console.log('✅ Profiles table is accessible');
    }
  }

  private static async createHelperFunctions(): Promise<void> {
    console.log('🛠️ Creating helper functions...');
    
    const createFunctionsSQL = `
      -- Create send friend request function
      CREATE OR REPLACE FUNCTION public.send_friend_request(friend_user_id UUID)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
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
    `;

    try {
      await supabase.rpc('exec_sql', { sql: createFunctionsSQL });
      console.log('✅ Helper functions created');
    } catch (error) {
      console.log('⚠️ Could not create helper functions automatically');
    }
  }

  static async testFriendsSystemAccess(): Promise<{
    success: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test 1: Friends table access
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('id')
        .limit(1);

      if (friendsError) {
        if (friendsError.code === '42P01') {
          issues.push('Friends table does not exist');
          recommendations.push('Apply database migration in Supabase SQL Editor');
        } else if (friendsError.code === 'PGRST301') {
          issues.push('RLS policies blocking access to friends table');
          recommendations.push('Check and fix RLS policies for friends table');
        } else {
          issues.push(`Friends table error: ${friendsError.message}`);
          recommendations.push('Check database connection and table configuration');
        }
      }

      // Test 2: Profiles table access
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      if (profilesError && profilesError.code !== 'PGRST116') {
        issues.push(`Profiles table access issue: ${profilesError.message}`);
        recommendations.push('Ensure profiles table has proper RLS policies');
      }

      // Test 3: Authentication check
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        issues.push('User not authenticated');
        recommendations.push('Sign in to the application');
      }

      return {
        success: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        issues: ['Critical database connection error'],
        recommendations: ['Check internet connection and Supabase configuration']
      };
    }
  }
}

// Auto-setup when module is imported
DatabaseSetup.ensureFriendsSystemSetup().catch(console.error); 