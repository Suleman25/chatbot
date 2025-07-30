import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { setupUserForFriends } from '@/utils/profileSetup';

interface Friend {
  friendship_id: string;
  friend_user_id: string; 
  friend_display_name: string;
  friend_avatar_url: string | null;
  friendship_status: string;
  friendship_created_at: string;
  is_online: boolean;
}

interface FriendRequest {
  request_id: string;
  requester_id: string;
  requester_display_name: string;
  requester_avatar_url: string | null;
  created_at: string;
}

interface UseFriendsReturn {
  friends: Friend[];
  friendRequests: FriendRequest[];
  loading: boolean;
  isConnected: boolean;
  setupComplete: boolean;
  refetch: () => Promise<void>;
  sendFriendRequest: (friendUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendUserId: string) => Promise<void>;
}

// Enhanced error handling with specific error codes
const categorizeError = (error: any): { 
  category: 'network' | 'database' | 'authentication' | 'permission' | 'validation' | 'unknown'; 
  isRetryable: boolean; 
  userMessage: string;
} => {
  if (!error) return { category: 'unknown', isRetryable: false, userMessage: 'Unknown error occurred' };
  
  const code = error.code;
  const message = error.message || '';
  
  // Network/Connection errors
  if (!navigator.onLine || message.includes('fetch')) {
    return { category: 'network', isRetryable: true, userMessage: 'Connection issue. Please check your internet.' };
  }
  
  // Database table not found
  if (code === '42P01') {
    return { category: 'database', isRetryable: false, userMessage: 'Database setup required. Please run migration.' };
  }
  
  // Permission denied (RLS issues)
  if (code === 'PGRST301' || message.includes('permission denied')) {
    return { category: 'permission', isRetryable: false, userMessage: 'Permission denied. Check user authentication.' };
  }
  
  // Authentication issues
  if (code === 'PGRST100' || message.includes('JWT')) {
    return { category: 'authentication', isRetryable: false, userMessage: 'Please sign in again.' };
  }
  
  // Empty result (not really an error)
  if (code === 'PGRST116' || code === 'PGRST204') {
    return { category: 'validation', isRetryable: false, userMessage: 'No data found' };
  }
  
  // Validation errors
  if (code === '23505' || message.includes('duplicate')) {
    return { category: 'validation', isRetryable: false, userMessage: 'Record already exists' };
  }
  
  return { category: 'unknown', isRetryable: true, userMessage: message || 'Something went wrong' };
};

export const useFriends = (): UseFriendsReturn => {
  const [state, setState] = useState({
    friends: [] as Friend[],
    friendRequests: [] as FriendRequest[],
    loading: true,
    isConnected: true,
    setupComplete: false,
  });

  const { toast } = useToast();

  // Check if database setup is complete
  const checkDatabaseSetup = useCallback(async (): Promise<boolean> => {
    try {
      // Test if friends table exists and is accessible
      const { error: friendsError } = await supabase
        .from('friends')
        .select('id')
        .limit(1);

      // Test if profiles table exists and is accessible  
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      // If both tables are accessible (even if empty), setup is complete
      const friendsAccessible = !friendsError || 
        friendsError.code === 'PGRST116' || 
        friendsError.code === 'PGRST204';

      const profilesAccessible = !profilesError || 
        profilesError.code === 'PGRST116' || 
        profilesError.code === 'PGRST204';

      return friendsAccessible && profilesAccessible;
    } catch (error) {
      console.error('Database setup check failed:', error);
      return false;
    }
  }, []);

  // Fetch friends using direct database queries (not RPC)
  const fetchFriends = useCallback(async () => {
    try {
      console.log('📞 Fetching friends with direct query...');
      
      // Get current user first
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          profiles!friends_user_id_fkey(display_name, avatar_url),
          profiles!friends_friend_id_fkey(display_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

      if (friendsError) {
        const errorInfo = categorizeError(friendsError);
        console.error('❌ Failed to fetch friends:', friendsError);
        
        if (errorInfo.category === 'database') {
          setState(prev => ({ ...prev, setupComplete: false }));
          return [];
        }
        
        throw friendsError;
      }

      // Transform the data to match the expected Friend interface
      const transformedFriends = (friendsData || []).map((item: any) => {
        const friendUserId = item.user_id === currentUser.id ? item.friend_id : item.user_id;
        const friendProfile = item.user_id === currentUser.id 
          ? item.profiles_friends_friend_id_fkey 
          : item.profiles_friends_user_id_fkey;

        return {
          friendship_id: item.id,
          friend_user_id: friendUserId,
          friend_display_name: friendProfile?.display_name || 'Unknown User',
          friend_avatar_url: friendProfile?.avatar_url || null,
          friendship_status: item.status,
          friendship_created_at: item.created_at,
          is_online: false // We'll implement this later
        };
      }) as Friend[];

      console.log(`✅ Fetched ${transformedFriends.length} friends`);
      return transformedFriends;
      
    } catch (error: any) {
      console.error('💥 fetchFriends error:', error);
      
      // Fallback to simple query without joins
      try {
        console.log('🔄 Trying simple fallback query...');
        
        // Get current user first
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('User not authenticated');

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('friends')
          .select('id, user_id, friend_id, status, created_at')
          .eq('status', 'accepted')
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

        if (fallbackError) throw fallbackError;

        // For each friend, get their profile separately
        const friendsWithProfiles: Friend[] = [];
        
        for (const friendship of fallbackData || []) {
          const friendUserId = friendship.user_id === currentUser.id ? friendship.friend_id : friendship.user_id;
          
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', friendUserId)
              .single();

            friendsWithProfiles.push({
              friendship_id: friendship.id,
              friend_user_id: friendUserId,
              friend_display_name: profile?.display_name || 'Unknown User',
              friend_avatar_url: profile?.avatar_url || null,
              friendship_status: friendship.status,
              friendship_created_at: friendship.created_at,
              is_online: false
            });
          } catch (profileError) {
            console.warn('Failed to fetch profile for friend:', friendUserId);
            // Still add the friend without profile details
            friendsWithProfiles.push({
              friendship_id: friendship.id,
              friend_user_id: friendUserId,
              friend_display_name: 'Unknown User',
              friend_avatar_url: null,
              friendship_status: friendship.status,
              friendship_created_at: friendship.created_at,
              is_online: false
            });
          }
        }

        console.log(`✅ Fallback query returned ${friendsWithProfiles.length} friends`);
        return friendsWithProfiles;
        
      } catch (fallbackError) {
        console.error('💥 Fallback query also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }, []);

  // Fetch friend requests using direct database queries (not RPC)
  const fetchFriendRequests = useCallback(async () => {
    try {
      console.log('📞 Fetching friend requests with direct query...');
      
      // Get current user first
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { data: requestsData, error: requestsError } = await supabase
        .from('friends')
        .select(`
          id,
          user_id,
          created_at,
          profiles!friends_user_id_fkey(display_name, avatar_url)
        `)
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) {
        const errorInfo = categorizeError(requestsError);
        console.error('❌ Failed to fetch friend requests:', requestsError);
        
        if (errorInfo.category === 'database') {
          setState(prev => ({ ...prev, setupComplete: false }));
          return [];
        }
        
        throw requestsError;
      }

      // Transform the data to match the expected FriendRequest interface
      const transformedRequests = (requestsData || []).map((item: any) => ({
        request_id: item.id,
        requester_id: item.user_id,
        requester_display_name: item.profiles?.display_name || 'Unknown User',
        requester_avatar_url: item.profiles?.avatar_url || null,
        created_at: item.created_at
      })) as FriendRequest[];

      console.log(`✅ Fetched ${transformedRequests.length} friend requests`);
      return transformedRequests;
      
    } catch (error: any) {
      console.error('💥 fetchFriendRequests error:', error);
      
      // Fallback to simple query without joins
      try {
        console.log('🔄 Trying simple fallback query for requests...');
        
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('User not authenticated');
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('friends')
          .select('id, user_id, created_at')
          .eq('friend_id', currentUser.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;

        // For each request, get the requester's profile separately
        const requestsWithProfiles: FriendRequest[] = [];
        
        for (const request of fallbackData || []) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', request.user_id)
              .single();

            requestsWithProfiles.push({
              request_id: request.id,
              requester_id: request.user_id,
              requester_display_name: profile?.display_name || 'Unknown User',
              requester_avatar_url: profile?.avatar_url || null,
              created_at: request.created_at
            });
          } catch (profileError) {
            console.warn('Failed to fetch profile for requester:', request.user_id);
            // Still add the request without profile details
            requestsWithProfiles.push({
              request_id: request.id,
              requester_id: request.user_id,
              requester_display_name: 'Unknown User',
              requester_avatar_url: null,
              created_at: request.created_at
            });
          }
        }

        console.log(`✅ Fallback query returned ${requestsWithProfiles.length} friend requests`);
        return requestsWithProfiles;
        
      } catch (fallbackError) {
        console.error('💥 Fallback query for requests also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }, []);

  // Main refetch function
  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, isConnected: true }));

    try {
      // Check database setup first
      const setupComplete = await checkDatabaseSetup();
      
      if (!setupComplete) {
        console.log('⚠️ Database setup incomplete, skipping data fetch');
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          setupComplete: false,
          friends: [],
          friendRequests: []
        }));
        return;
      }

      // Ensure user has profile before fetching friends data
      console.log('👤 Ensuring user profile exists...');
      const userSetupSuccess = await setupUserForFriends();
      
      if (!userSetupSuccess) {
        console.log('⚠️ User profile setup failed, but continuing...');
        // Don't fail completely, just log the issue
      }

      // Fetch data in parallel
      const [friends, friendRequests] = await Promise.all([
        fetchFriends(),
        fetchFriendRequests()
      ]);

      console.log('🔄 Refetch completed - updating state:', {
        friendsCount: friends.length,
        requestsCount: friendRequests.length,
        friendsList: friends.map(f => ({ id: f.friendship_id, name: f.friend_display_name })),
        requestsList: friendRequests.map(r => ({ id: r.request_id, name: r.requester_display_name }))
      });

      setState(prev => ({
        ...prev,
        friends,
        friendRequests,
        loading: false,
        setupComplete: true,
        isConnected: true
      }));

    } catch (error: any) {
      console.error('💥 refetch error:', error);
      const errorInfo = categorizeError(error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        isConnected: errorInfo.category !== 'network',
        setupComplete: errorInfo.category !== 'database'
      }));

      // Only show toast for non-setup errors
      if (errorInfo.category !== 'database') {
        toast({
          title: "Connection Issue",
          description: errorInfo.userMessage,
          variant: "destructive",
        });
      }
    }
  }, [checkDatabaseSetup, fetchFriends, fetchFriendRequests, toast]);

  // Send friend request using direct database operations (not RPC)
  const sendFriendRequest = useCallback(async (friendUserId: string) => {
    try {
      console.log(`📤 Sending friend request to user: ${friendUserId}`);
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Please sign in first');
      }

      if (currentUser.id === friendUserId) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if friendship already exists
      const { data: existingData, error: checkError } = await supabase
        .from('friends')
        .select('id, status')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${currentUser.id})`);

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing friendship:', checkError);
        throw new Error('Failed to check existing friendship');
      }

      if (existingData && existingData.length > 0) {
        const existing = existingData[0];
        if (existing.status === 'pending') {
          throw new Error('Friend request already sent');
        } else if (existing.status === 'accepted') {
          throw new Error('Already friends with this user');
        } else if (existing.status === 'blocked') {
          throw new Error('Cannot send request to this user');
        }
      }

      // Check if target user exists by checking profiles
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .eq('user_id', friendUserId)
        .single();

      if (profileError || !targetProfile) {
        throw new Error('User not found or does not have a profile');
      }

      // Create new friend request
      const { data: newRequest, error: insertError } = await supabase
        .from('friends')
        .insert([{
          user_id: currentUser.id,
          friend_id: friendUserId,
          status: 'pending'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating friend request:', insertError);
        if (insertError.code === '23505') {
          throw new Error('Friend request already exists');
        }
        throw new Error('Failed to send friend request');
      }

      console.log('✅ Friend request sent successfully');
      toast({
        title: "Friend Request Sent! 👥",
        description: `Friend request sent to ${targetProfile.display_name || 'user'}`,
      });

      // Refresh data
      await refetch();

    } catch (error: any) {
      console.error('💥 sendFriendRequest error:', error);
      const errorInfo = categorizeError(error);
      
      toast({
        title: "Failed to Send Request",
        description: error.message || errorInfo.userMessage,
        variant: "destructive",
      });
    }
  }, [toast, refetch]);

  // Accept friend request using direct database operations
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    try {
      console.log(`✅ Accepting friend request: ${requestId}`);
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Please sign in first');
      }

      // Update the friend request to accepted
      const { data: updatedRequest, error: updateError } = await supabase
        .from('friends')
        .update({ 
          status: 'accepted', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', requestId)
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError || !updatedRequest) {
        console.error('❌ Error accepting friend request:', updateError);
        throw new Error('Friend request not found or already processed');
      }

      console.log('✅ Friend request accepted successfully:', {
        requestId,
        updatedData: updatedRequest,
        newStatus: updatedRequest.status
      });

      // Immediately update local state to remove the request for better UX
      setState(prev => ({
        ...prev,
        friendRequests: prev.friendRequests.filter(req => req.request_id !== requestId)
      }));

      toast({
        title: "Friend Request Accepted! 🎉",
        description: "You are now friends!",
      });

      // Refresh data immediately to get the updated friends list
      console.log('🔄 Calling refetch after accepting friend request...');
      await refetch();
      console.log('✅ Refetch completed after accepting friend request');

    } catch (error: any) {
      console.error('💥 acceptFriendRequest error:', error);
      const errorInfo = categorizeError(error);
      
      toast({
        title: "Failed to Accept Request",
        description: error.message || errorInfo.userMessage,
        variant: "destructive",
      });
    }
  }, [toast, refetch]);

  // Reject friend request using direct database operations
  const rejectFriendRequest = useCallback(async (requestId: string) => {
    try {
      console.log(`❌ Rejecting friend request: ${requestId}`);
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Please sign in first');
      }

      // Delete the friend request
      const { error: deleteError } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)
        .eq('friend_id', currentUser.id)
        .eq('status', 'pending');

      if (deleteError) {
        console.error('❌ Error rejecting friend request:', deleteError);
        throw new Error('Failed to reject friend request');
      }

      // Immediately update local state to remove the request for better UX
      setState(prev => ({
        ...prev,
        friendRequests: prev.friendRequests.filter(req => req.request_id !== requestId)
      }));

      console.log('✅ Friend request rejected successfully');
      toast({
        title: "Request Rejected",
        description: "Friend request has been rejected",
      });

      // Refresh data to ensure consistency
      await refetch();

    } catch (error: any) {
      console.error('💥 rejectFriendRequest error:', error);
      const errorInfo = categorizeError(error);
      
      toast({
        title: "Failed to Reject Request",
        description: error.message || errorInfo.userMessage,
        variant: "destructive",
      });
    }
  }, [toast, refetch]);

  // Remove friend using direct database operations
  const removeFriend = useCallback(async (friendUserId: string) => {
    try {
      console.log(`🗑️ Removing friend: ${friendUserId}`);
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Please sign in first');
      }

      // Delete friendship (works in both directions)
      const { error: deleteError } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${currentUser.id})`);

      if (deleteError) {
        console.error('❌ Error removing friend:', deleteError);
        throw new Error('Failed to remove friend');
      }

      console.log('✅ Friend removed successfully');
      toast({
        title: "Friend Removed",
        description: "Friend has been removed from your list",
      });

      // Refresh data
      await refetch();

    } catch (error: any) {
      console.error('💥 removeFriend error:', error);
      const errorInfo = categorizeError(error);
      
      toast({
        title: "Failed to Remove Friend",
        description: error.message || errorInfo.userMessage,
        variant: "destructive",
      });
    }
  }, [toast, refetch]);

  // Initial load
  useEffect(() => {
    console.log('🎯 useFriends initializing...');
    refetch();
  }, [refetch]);

  // Memoize the return value for performance
  return useMemo(() => ({
    friends: state.friends,
    friendRequests: state.friendRequests,
    loading: state.loading,
    isConnected: state.isConnected,
    setupComplete: state.setupComplete,
    refetch,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  }), [
    state.friends,
    state.friendRequests,
    state.loading,
    state.isConnected,
    state.setupComplete,
    refetch,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  ]);
}; 