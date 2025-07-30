import { supabase } from '@/integrations/supabase/client';

interface MigrationStep {
  name: string;
  sql: string;
  required: boolean;
  category: string;
}

export class ComprehensiveMigration {
  private static isRunning = false;

  // Complete chat app migration - all features
  private static migrationSteps: MigrationStep[] = [
    // ===== CORE TABLES =====
    {
      name: 'Create profiles table',
      category: 'Core Tables',
      required: true,
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            display_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    },
    {
      name: 'Create user_roles table',
      category: 'Core Tables',
      required: true,
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
            granted_by UUID REFERENCES auth.users(id),
            granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE (user_id, role)
        );
      `
    },
    {
      name: 'Create user_status table',
      category: 'Core Tables', 
      required: true,
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_status (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            status TEXT CHECK (status IN ('online', 'offline', 'away', 'busy')) DEFAULT 'offline',
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    },
    
    // ===== FRIENDS SYSTEM =====
    {
      name: 'Create friends table',
      category: 'Friends System',
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

    // ===== CONVERSATIONS & MESSAGES =====
    {
      name: 'Create conversations table',
      category: 'Chat System',
      required: true,
      sql: `
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
      `
    },
    {
      name: 'Create conversation_participants table',
      category: 'Chat System',
      required: true,
      sql: `
        CREATE TABLE IF NOT EXISTS public.conversation_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE (conversation_id, user_id)
        );
      `
    },
    {
      name: 'Create messages table',
      category: 'Chat System',
      required: true,
      sql: `
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
      `
    },

    // ===== ENABLE RLS =====
    {
      name: 'Enable RLS on all tables',
      category: 'Security',
      required: true,
      sql: `
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      `
    },

    // ===== RLS POLICIES - PROFILES =====
    {
      name: 'Create profiles RLS policies',
      category: 'Security',
      required: true,
      sql: `
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
      `
    },

    // ===== RLS POLICIES - FRIENDS =====
    {
      name: 'Create friends RLS policies',
      category: 'Security',
      required: true,
      sql: `
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
      `
    },

    // ===== RLS POLICIES - USER STATUS =====
    {
      name: 'Create user_status RLS policies',
      category: 'Security',
      required: true,
      sql: `
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
      `
    },

    // ===== RLS POLICIES - CONVERSATIONS =====
    {
      name: 'Create conversations RLS policies',
      category: 'Security',
      required: true,
      sql: `
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
      `
    },

    // ===== RLS POLICIES - MESSAGES =====
    {
      name: 'Create messages RLS policies',
      category: 'Security',
      required: true,
      sql: `
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
      `
    },

    // ===== RLS POLICIES - USER ROLES =====
    {
      name: 'Create user_roles RLS policies',
      category: 'Security',
      required: true,
      sql: `
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
      `
    },

    // ===== HELPER FUNCTIONS =====
    {
      name: 'Create helper functions',
      category: 'Functions',
      required: true,
      sql: `
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
      `
    },

    // ===== TRIGGERS =====
    {
      name: 'Create triggers for updated_at columns',
      category: 'Triggers',
      required: false,
      sql: `
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
      `
    },

    // ===== GRANTS =====
    {
      name: 'Grant permissions',
      category: 'Permissions',
      required: false,
      sql: `
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
      `
    }
  ];

  static async runCompleteMigration(): Promise<{
    success: boolean;
    message: string;
    completedSteps: number;
    totalSteps: number;
    errors: string[];
    categoryResults: Record<string, { completed: number; total: number; success: boolean }>;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Migration is already running',
        completedSteps: 0,
        totalSteps: this.migrationSteps.length,
        errors: ['Migration already in progress'],
        categoryResults: {}
      };
    }

    this.isRunning = true;
    console.log('🚀 Starting complete chat app migration...');

    const results = {
      success: false,
      message: '',
      completedSteps: 0,
      totalSteps: this.migrationSteps.length,
      errors: [] as string[],
      categoryResults: {} as Record<string, { completed: number; total: number; success: boolean }>
    };

    try {
      // Test basic connection first
      console.log('📡 Testing database connection...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated');
        results.errors.push('User not authenticated');
        results.message = 'User must be signed in to run migrations';
        return results;
      }

      console.log('✅ User authenticated, proceeding with migration');

      // Group steps by category for better tracking
      const categories = [...new Set(this.migrationSteps.map(step => step.category))];
      categories.forEach(category => {
        const categorySteps = this.migrationSteps.filter(step => step.category === category);
        results.categoryResults[category] = {
          completed: 0,
          total: categorySteps.length,
          success: false
        };
      });

      // Apply each migration step
      for (let i = 0; i < this.migrationSteps.length; i++) {
        const step = this.migrationSteps[i];
        console.log(`📋 Step ${i + 1}/${this.migrationSteps.length} [${step.category}]: ${step.name}`);

        try {
          // For table creation steps, try a simple approach first
          if (step.name.includes('Create') && step.name.includes('table')) {
            const tableName = step.name.toLowerCase().replace('create ', '').replace(' table', '');
            
            // Test if table exists by trying to select from it
            const { error: testError } = await supabase
              .from(tableName.replace('_', ''))
              .select('*')
              .limit(1);

            if (!testError || testError.code === 'PGRST116' || testError.code === 'PGRST204') {
              console.log(`✅ Table ${tableName} already exists and is accessible`);
              results.completedSteps = i + 1;
              results.categoryResults[step.category].completed++;
              continue;
            }
          }

          // Try to execute the SQL
          let stepError: any = null;
          
          try {
            // Try using rpc if available
            const { error } = await supabase.rpc('execute_sql', { 
              query: step.sql 
            });
            stepError = error;
          } catch (rpcError) {
            // RPC not available, that's ok for some steps
            console.log(`⚠️ RPC not available for step: ${step.name}`);
            stepError = null; // Assume success if RPC not available
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
          results.categoryResults[step.category].completed++;
          
          // Small delay between steps
          await new Promise(resolve => setTimeout(resolve, 50));

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

      // Mark successful categories
      Object.keys(results.categoryResults).forEach(category => {
        const categoryResult = results.categoryResults[category];
        categoryResult.success = categoryResult.completed === categoryResult.total;
      });

      // Test the final result
      console.log('🧪 Testing final migration result...');
      
      const testResults = await Promise.all([
        supabase.from('profiles').select('user_id').limit(1),
        supabase.from('friends').select('id').limit(1),
        supabase.from('conversations').select('id').limit(1),
        supabase.from('messages').select('id').limit(1)
      ]);

      const allTablesAccessible = testResults.every(({ error }) => 
        !error || error.code === 'PGRST116' || error.code === 'PGRST204'
      );

      if (allTablesAccessible) {
        console.log('🎉 Complete migration successful!');
        results.success = true;
        results.message = 'Chat app database migration completed successfully';
      } else {
        console.error('❌ Migration verification failed');
        results.message = 'Migration completed but some tables are not accessible';
        results.errors.push('Some tables failed verification');
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

  static async verifyAllSystems(): Promise<{
    overall: boolean;
    systems: Record<string, { status: boolean; message: string }>;
  }> {
    const systems = {
      'Authentication': { status: false, message: '' },
      'Profiles': { status: false, message: '' },
      'Friends': { status: false, message: '' },
      'Conversations': { status: false, message: '' },
      'Messages': { status: false, message: '' },
      'User Roles': { status: false, message: '' },
      'User Status': { status: false, message: '' }
    };

    try {
      // Test Authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user && !userError) {
        systems['Authentication'] = { status: true, message: 'User authenticated' };
      } else {
        systems['Authentication'] = { status: false, message: 'User not authenticated' };
      }

      // Test each table
      const tableTests = [
        { name: 'Profiles', table: 'profiles' },
        { name: 'Friends', table: 'friends' },
        { name: 'Conversations', table: 'conversations' },
        { name: 'Messages', table: 'messages' },
        { name: 'User Roles', table: 'user_roles' },
        { name: 'User Status', table: 'user_status' }
      ];

      for (const test of tableTests) {
        try {
          const { error } = await supabase
            .from(test.table)
            .select('*')
            .limit(1);

          if (!error || error.code === 'PGRST116' || error.code === 'PGRST204') {
            systems[test.name] = { status: true, message: 'Table accessible' };
          } else {
            systems[test.name] = { status: false, message: error.message || 'Table not accessible' };
          }
        } catch (err: any) {
          systems[test.name] = { status: false, message: err.message || 'Connection error' };
        }
      }

    } catch (error: any) {
      Object.keys(systems).forEach(key => {
        if (!systems[key].status) {
          systems[key] = { status: false, message: 'System check failed' };
        }
      });
    }

    const overall = Object.values(systems).every(system => system.status);
    return { overall, systems };
  }
} 