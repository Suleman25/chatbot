import { supabase } from '@/integrations/supabase/client';

export const fixAdminRole = async (email: string) => {
  try {
    console.log('🔧 Fixing admin role for:', email);

    // Get current user to see if this is the same email
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    // If the email matches the current user, we can use their user_id
    if (currentUser.email === email) {
      const userId = currentUser.id;
      console.log('✅ Using current user ID:', userId);

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      // Create profile if it doesn't exist
      if (profileError && profileError.code === 'PGRST116') {
        console.log('📝 Creating profile for user...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: email.split('@')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createProfileError) {
          console.error('❌ Error creating profile:', createProfileError);
          throw new Error(`Failed to create profile: ${createProfileError.message}`);
        }
        console.log('✅ Profile created successfully');
      }

      // First, delete any existing role for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Error deleting existing role:', deleteError);
        // Continue anyway, might not have had a role
      }

      // Insert the admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          created_at: new Date().toISOString()
        })
        .select();

      if (roleError) {
        console.error('❌ Error setting admin role:', roleError);
        throw new Error(`Failed to set admin role: ${roleError.message}`);
      }

      console.log('✅ Admin role set successfully:', roleData);

      return {
        success: true,
        message: `Admin role assigned to ${email}`,
        user_id: userId
      };
    } else {
      throw new Error('Email does not match current user. Please log in with the correct account.');
    }

  } catch (error) {
    console.error('❌ Error in fixAdminRole:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      user_id: null
    };
  }
};

export const checkAdminStatus = async (email: string) => {
  try {
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return {
        exists: false,
        message: 'No authenticated user found'
      };
    }

    // Check if email matches current user
    if (currentUser.email !== email) {
      return {
        exists: false,
        message: 'Email does not match current user'
      };
    }

    const userId = currentUser.id;

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    return {
      exists: true,
      user_id: userId,
      display_name: profile?.display_name || email.split('@')[0],
      role: roleData?.role || 'user',
      isAdmin: roleData?.role === 'admin',
      hasProfile: !profileError
    };

  } catch (error) {
    console.error('Error checking admin status:', error);
    return {
      exists: false,
      message: 'Error checking status'
    };
  }
}; 