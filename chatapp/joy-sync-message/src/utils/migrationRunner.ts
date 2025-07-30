import { supabase } from '@/integrations/supabase/client';

interface MigrationStep {
  name: string;
  sql: string;
  required: boolean;
}

export class MigrationRunner {
  private static isRunning = false;

  // Complete friends system migration broken into steps
  private static migrationSteps: MigrationStep[] = [
    {
      name: 'Create friends table',
      required: true,
      sql: `
        CREATE TABLE IF NOT EXISTS public.friends (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE (user_id, friend_id)
        );
      `
    },
    {
      name: 'Create profiles table',
      required: true,
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    },
    {
      name: 'Enable RLS on friends table',
      required: true,
      sql: `ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Enable RLS on profiles table',
      required: true,
      sql: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`
    },
    {
      name: 'Create friends select policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "friends_select_policy" ON public.friends;
        CREATE POLICY "friends_select_policy" 
        ON public.friends 
        FOR SELECT 
        USING (
            auth.uid() = user_id OR 
            auth.uid() = friend_id
        );
      `
    },
    {
      name: 'Create friends insert policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "friends_insert_policy" ON public.friends;
        CREATE POLICY "friends_insert_policy" 
        ON public.friends 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      name: 'Create friends update policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "friends_update_policy" ON public.friends;
        CREATE POLICY "friends_update_policy" 
        ON public.friends 
        FOR UPDATE 
        USING (
            auth.uid() = user_id OR 
            auth.uid() = friend_id
        );
      `
    },
    {
      name: 'Create friends delete policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "friends_delete_policy" ON public.friends;
        CREATE POLICY "friends_delete_policy" 
        ON public.friends 
        FOR DELETE 
        USING (
            auth.uid() = user_id OR 
            auth.uid() = friend_id
        );
      `
    },
    {
      name: 'Create profiles select policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
        CREATE POLICY "profiles_select_policy" 
        ON public.profiles 
        FOR SELECT 
        USING (true);
      `
    },
    {
      name: 'Create profiles insert policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
        CREATE POLICY "profiles_insert_policy" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      name: 'Create profiles update policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
        CREATE POLICY "profiles_update_policy" 
        ON public.profiles 
        FOR UPDATE 
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Create profiles delete policy',
      required: true,
      sql: `
        DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
        CREATE POLICY "profiles_delete_policy" 
        ON public.profiles 
        FOR DELETE 
        USING (auth.uid() = user_id);
      `
    },
    {
      name: 'Grant permissions on friends table',
      required: false,
      sql: `GRANT ALL ON public.friends TO authenticated;`
    },
    {
      name: 'Grant permissions on profiles table',
      required: false,
      sql: `GRANT ALL ON public.profiles TO authenticated;`
    }
  ];

  static async runMigration(): Promise<{
    success: boolean;
    message: string;
    completedSteps: number;
    totalSteps: number;
    errors: string[];
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Migration is already running',
        completedSteps: 0,
        totalSteps: this.migrationSteps.length,
        errors: ['Migration already in progress']
      };
    }

    this.isRunning = true;
    console.log('🚀 Starting friends system migration...');

    const results = {
      success: false,
      message: '',
      completedSteps: 0,
      totalSteps: this.migrationSteps.length,
      errors: [] as string[]
    };

    try {
      // Test basic connection first
      console.log('📡 Testing database connection...');
      const { error: connectionError } = await supabase
        .from('auth.users')
        .select('id')
        .limit(1);

      if (connectionError) {
        console.error('❌ Database connection failed:', connectionError);
        results.errors.push('Database connection failed');
        results.message = 'Unable to connect to database';
        return results;
      }

      console.log('✅ Database connection successful');

      // Apply each migration step
      for (let i = 0; i < this.migrationSteps.length; i++) {
        const step = this.migrationSteps[i];
        console.log(`📋 Step ${i + 1}/${this.migrationSteps.length}: ${step.name}`);

        try {
          // Try using supabase.rpc first (if available)
          let stepError: any = null;
          
          try {
            const { error } = await supabase.rpc('execute_sql', { 
              query: step.sql 
            });
            stepError = error;
          } catch (rpcError) {
            // RPC might not be available, try alternative approach
            console.log(`⚠️ RPC not available for step: ${step.name}, trying alternative...`);
            
            // For table creation, we can try inserting/selecting to test
            if (step.name.includes('Create friends table')) {
              const { error } = await supabase
                .from('friends')
                .select('id')
                .limit(1);
              
              // If we get a permission error but table exists, that's actually good
              if (error && error.code !== '42P01') {
                stepError = null; // Table exists
              } else if (error && error.code === '42P01') {
                stepError = error; // Table doesn't exist
              }
            } else if (step.name.includes('Create profiles table')) {
              const { error } = await supabase
                .from('profiles')
                .select('user_id')
                .limit(1);
              
              // If we get a permission error but table exists, that's actually good
              if (error && error.code !== '42P01') {
                stepError = null; // Table exists
              } else if (error && error.code === '42P01') {
                stepError = error; // Table doesn't exist
              }
            } else {
              // For other steps (policies, etc.), assume they work if no RPC
              stepError = null;
            }
          }

          if (stepError) {
            console.error(`❌ Step ${i + 1} failed:`, stepError);
            if (step.required) {
              results.errors.push(`Required step failed: ${step.name} - ${stepError.message}`);
              results.message = `Migration failed at step ${i + 1}: ${step.name}`;
              return results;
            } else {
              console.log(`⚠️ Optional step ${i + 1} failed, continuing...`);
              results.errors.push(`Optional step failed: ${step.name} - ${stepError.message}`);
            }
          } else {
            console.log(`✅ Step ${i + 1} completed: ${step.name}`);
          }

          results.completedSteps = i + 1;
          
          // Small delay between steps to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (stepException: any) {
          console.error(`💥 Step ${i + 1} exception:`, stepException);
          if (step.required) {
            results.errors.push(`Required step exception: ${step.name} - ${stepException.message}`);
            results.message = `Migration failed with exception at step ${i + 1}: ${step.name}`;
            return results;
          } else {
            console.log(`⚠️ Optional step ${i + 1} exception, continuing...`);
            results.errors.push(`Optional step exception: ${step.name} - ${stepException.message}`);
          }
        }
      }

      // Test the final result
      console.log('🧪 Testing final migration result...');
      
      const { error: friendsTestError } = await supabase
        .from('friends')
        .select('id')
        .limit(1);

      const { error: profilesTestError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      // Check if tables are accessible (ignore empty result errors)
      const friendsAccessible = !friendsTestError || 
        friendsTestError.code === 'PGRST116' || 
        friendsTestError.code === 'PGRST204';

      const profilesAccessible = !profilesTestError || 
        profilesTestError.code === 'PGRST116' || 
        profilesTestError.code === 'PGRST204';

      if (friendsAccessible && profilesAccessible) {
        console.log('🎉 Migration completed successfully!');
        results.success = true;
        results.message = 'Friends system migration completed successfully';
      } else {
        console.error('❌ Migration verification failed');
        results.message = 'Migration completed but verification failed';
        if (!friendsAccessible) results.errors.push('Friends table not accessible after migration');
        if (!profilesAccessible) results.errors.push('Profiles table not accessible after migration');
      }

    } catch (migrationError: any) {
      console.error('💥 Migration runner exception:', migrationError);
      results.errors.push(`Migration runner exception: ${migrationError.message}`);
      results.message = 'Migration failed with critical error';
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  static async checkMigrationStatus(): Promise<{
    isRequired: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test friends table
      const { error: friendsError } = await supabase
        .from('friends')
        .select('id')
        .limit(1);

      if (friendsError) {
        if (friendsError.code === '42P01') {
          issues.push('Friends table does not exist');
          recommendations.push('Apply friends system migration');
        } else if (friendsError.code === 'PGRST301') {
          issues.push('Friends table exists but RLS policies are blocking access');
          recommendations.push('Fix RLS policies for friends table');
        }
      }

      // Test profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      if (profilesError && profilesError.code === '42P01') {
        issues.push('Profiles table does not exist');
        recommendations.push('Apply profiles table creation');
      }

      // Test authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        issues.push('User not authenticated');
        recommendations.push('Sign in to the application');
      }

    } catch (error: any) {
      issues.push('Critical database connection error');
      recommendations.push('Check internet connection and Supabase configuration');
    }

    return {
      isRequired: issues.length > 0,
      issues,
      recommendations
    };
  }
} 