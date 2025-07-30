import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures the current user has a profile in the profiles table
 * This is essential for the friends system to work properly
 */
export const ensureUserProfile = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('No user found, skipping profile setup');
      return false;
    }

    console.log('🔍 Checking if user has profile:', user.id);

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', checkError);
      return false;
    }

    if (existingProfile) {
      console.log('✅ User profile already exists');
      return true;
    }

    // Create profile if it doesn't exist
    console.log('📝 Creating user profile...');
    
    const displayName = user.user_metadata?.display_name || 
                       user.user_metadata?.full_name || 
                       user.email?.split('@')[0] || 
                       'Chat User';

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([{
        user_id: user.id,
        display_name: displayName,
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create user profile:', insertError);
      
      // Check if it's a duplicate key error (profile was created by another process)
      if (insertError.code === '23505') {
        console.log('✅ Profile already exists (created by another process)');
        return true;
      }
      
      return false;
    }

    console.log('✅ User profile created successfully:', newProfile);
    return true;

  } catch (error) {
    console.error('💥 Error in ensureUserProfile:', error);
    return false;
  }
};

/**
 * Ensures the current user has both profile and user status entries
 * This sets up everything needed for the friends system
 */
export const setupUserForFriends = async () => {
  try {
    // First ensure profile exists
    const profileSuccess = await ensureUserProfile();
    
    if (!profileSuccess) {
      console.error('❌ Failed to setup user profile');
      return false;
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    // Ensure user status exists
    console.log('🔍 Setting up user status...');
    
    const { error: statusError } = await supabase
      .from('user_status')
      .upsert({
        user_id: user.id,
        status: 'online',
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (statusError) {
      console.error('❌ Failed to setup user status:', statusError);
      // Don't fail the whole setup if status creation fails
    } else {
      console.log('✅ User status setup complete');
    }

    console.log('🎉 User setup for friends system complete!');
    return true;

  } catch (error) {
    console.error('💥 Error in setupUserForFriends:', error);
    return false;
  }
}; 