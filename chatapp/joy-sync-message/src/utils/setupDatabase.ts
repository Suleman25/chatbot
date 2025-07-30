import { supabase } from '@/integrations/supabase/client';

export const setupDatabase = async () => {
  try {
    console.log('🔧 Setting up database...');
    
    // Step 1: Check if profiles table exists and has email column
    const { data: profileCheck, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .limit(1);
    
    if (profileError) {
      console.log('❌ Profiles table not accessible:', profileError);
      return false;
    }
    
    console.log('✅ Profiles table accessible');
    
    // Step 2: Get all auth users and ensure they have profiles
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // Step 3: Create profiles for any missing users
    // We'll do this by checking each user individually
    const knownUserIds = [
      '6cc043e9-a56c-40a2-9504-46265dc7f36b', // Jack
      '4c296628-ed91-47c2-96db-14640269f17d', // Marium
      '033314da-63a8-4789-ab4d-8b1f51659342', // suleman
      '3e40ef5f-d957-4374-9a90-a1570c7ee1d6', // sam
      '46febed0-a336-4b02-8d60-0c270ff44943'  // xarodeh233/Tom
    ];
    
    for (const userId of knownUserIds) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      if (!existingProfile) {
        console.log('📝 Creating profile for user:', userId);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: 'Unknown User',
            email: 'No email available',
            created_at: new Date().toISOString(),
            is_admin: false
          });
        
        if (insertError) {
          console.log('⚠️ Failed to create profile for:', userId, insertError);
        } else {
          console.log('✅ Created profile for:', userId);
        }
      }
    }
    
    console.log('✅ Database setup completed');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  }
};

export const checkDatabaseSetup = async () => {
  try {
    // Try to query profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .limit(1);
    
    if (error) {
      console.log('❌ Database setup check failed:', error);
      return false;
    }
    
    console.log('✅ Database setup check passed');
    return true;
  } catch (error) {
    console.error('❌ Database setup check error:', error);
    return false;
  }
};

export const syncUserProfiles = async () => {
  try {
    console.log('🔄 Syncing user profiles...');
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return false;
    }
    
    console.log('✅ Found', profiles?.length || 0, 'profiles');
    
    // Update profiles with better display names and emails
    for (const profile of profiles || []) {
      let displayName = profile.display_name;
      let email = profile.email;
      
      // Update specific users with their real names
      switch (profile.user_id) {
        case '6cc043e9-a56c-40a2-9504-46265dc7f36b':
          displayName = 'Jack';
          email = 'vopoh47826@kloudis.com';
          break;
        case '4c296628-ed91-47c2-96db-14640269f17d':
          displayName = 'Marium';
          email = 'mariummansoori18@gmail.com';
          break;
        case '033314da-63a8-4789-ab4d-8b1f51659342':
          displayName = 'suleman';
          email = 'sulemanjamil05@gmail.com';
          break;
        case '3e40ef5f-d957-4374-9a90-a1570c7ee1d6':
          displayName = 'sam';
          email = 'sulemanjamil177@gmail.com';
          break;
        case '46febed0-a336-4b02-8d60-0c270ff44943':
          displayName = 'Tom';
          email = 'xarodeh233@coursora.com';
          break;
        default:
          // For unknown users, use email as display name if available
          if (profile.email && profile.email !== 'No email available') {
            displayName = profile.email.split('@')[0];
          }
          break;
      }
      
      // Update profile if needed
      if (displayName !== profile.display_name || email !== profile.email) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            email: email
          })
          .eq('user_id', profile.user_id);
        
        if (updateError) {
          console.log('⚠️ Failed to update profile for:', profile.user_id, updateError);
        } else {
          console.log('✅ Updated profile for:', profile.user_id, '->', displayName);
        }
      }
    }
    
    console.log('✅ User profiles synced successfully');
    return true;
  } catch (error) {
    console.error('❌ Error syncing user profiles:', error);
    return false;
  }
}; 