import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

// Global state for user management
let globalUserCache: UserProfile[] = [];
let globalUserRoles: Map<string, string> = new Map();
let subscribers: Set<(users: UserProfile[], roles: Map<string, string>) => void> = new Set();

// Global user deletion event
let deletionSubscribers: Set<(userId: string) => void> = new Set();

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>(globalUserCache);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(globalUserRoles);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Subscribe to global updates
  useEffect(() => {
    const updateHandler = (updatedUsers: UserProfile[], updatedRoles: Map<string, string>) => {
      setUsers(updatedUsers);
      setUserRoles(updatedRoles);
    };

    const deletionHandler = (deletedUserId: string) => {
      console.log('🔄 Global user deletion event received:', deletedUserId);
      // Force refresh after user deletion
      setTimeout(() => {
        refreshUserData();
      }, 500);
    };

    subscribers.add(updateHandler);
    deletionSubscribers.add(deletionHandler);

    return () => {
      subscribers.delete(updateHandler);
      deletionSubscribers.delete(deletionHandler);
    };
  }, []);

  // Broadcast updates to all subscribers
  const broadcastUpdate = useCallback((updatedUsers: UserProfile[], updatedRoles: Map<string, string>) => {
    globalUserCache = updatedUsers;
    globalUserRoles = updatedRoles;
    
    subscribers.forEach(callback => {
      callback(updatedUsers, updatedRoles);
    });
  }, []);

  // Broadcast user deletion event
  const broadcastUserDeletion = useCallback((userId: string) => {
    console.log('📢 Broadcasting user deletion:', userId);
    deletionSubscribers.forEach(callback => {
      callback(userId);
    });
  }, []);

  // Fetch user roles
  const fetchUserRoles = useCallback(async () => {
    try {
      console.log('🔍 Fetching user roles globally...');
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching user roles:', error);
        return new Map<string, string>();
      }

      const rolesMap = new Map<string, string>();
      if (data) {
        data.forEach((roleData) => {
          rolesMap.set(roleData.user_id, roleData.role);
        });
      }
      
      console.log('✅ User roles fetched globally:', rolesMap.size, 'roles');
      return rolesMap;
    } catch (error) {
      console.error('💥 Error fetching user roles:', error);
      return new Map<string, string>();
    }
  }, []);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    if (!user) {
      console.log('❌ No user found, skipping users fetch');
      return [];
    }

    try {
      console.log('🔍 Fetching users globally... Current user ID:', user.id);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, created_at')
        .neq('user_id', user.id) // Exclude current user
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
        return [];
      }

      console.log('✅ Users fetched globally:', profiles?.length || 0, 'users');
      
      // Double-check: ensure current user is not in the results
      const userList = (profiles || []).filter(profile => profile.user_id !== user.id);
      console.log('✅ Final user list after filtering:', userList.length, 'users');
      
      return userList;
    } catch (err) {
      console.error('💥 Unexpected error fetching users:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching users",
        variant: "destructive",
      });
      return [];
    }
  }, [user, toast]);

  // Refresh user data and broadcast
  const refreshUserData = useCallback(async () => {
    console.log('🔄 Global user data refresh initiated...');
    setLoading(true);
    
    try {
      const [fetchedUsers, fetchedRoles] = await Promise.all([
        fetchUsers(),
        fetchUserRoles()
      ]);

      broadcastUpdate(fetchedUsers, fetchedRoles);
      console.log('✅ Global user data refreshed:', fetchedUsers.length, 'users');
    } catch (error) {
      console.error('💥 Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, fetchUserRoles, broadcastUpdate]);

  // Delete user globally
  const deleteUserGlobally = useCallback(async (userId: string, displayName: string | null) => {
    console.log('🗑️ Global user deletion initiated:', userId, displayName);
    
    try {
      // Perform the deletion (similar to previous implementations)
      
      // Step 1: Delete from conversations and conversation_participants if tables exist
      try {
        const { error: convParticipantsError } = await supabase
          .from('conversation_participants')
          .delete()
          .eq('user_id', userId);

        if (convParticipantsError && convParticipantsError.code !== '42P01') {
          console.warn('⚠️ Error deleting conversation participants:', convParticipantsError);
        }

        const { error: conversationsError } = await supabase
          .from('conversations')
          .delete()
          .eq('created_by', userId);

        if (conversationsError && conversationsError.code !== '42P01') {
          console.warn('⚠️ Error deleting conversations:', conversationsError);
        }
      } catch (convError) {
        console.warn('⚠️ Conversation cleanup error (tables may not exist):', convError);
      }

      // Step 2: Delete user's messages
      console.log('🗑️ Deleting user messages...');
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);

      if (messagesError) {
        console.warn('⚠️ Error deleting messages:', messagesError);
      }

      // Step 3: Delete user's friend relationships
      console.log('🗑️ Deleting friend relationships...');
      const { error: friendsError1 } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', userId);

      const { error: friendsError2 } = await supabase
        .from('friends')
        .delete()
        .eq('friend_id', userId);

      if (friendsError1 || friendsError2) {
        console.warn('⚠️ Error deleting friend relationships:', friendsError1 || friendsError2);
      }

      // Step 4: Delete user's roles
      console.log('🗑️ Deleting user roles...');
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.warn('⚠️ Error deleting user roles:', rolesError);
      }

      // Step 5: Delete user profile
      console.log('🗑️ Deleting user profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('❌ Error deleting user profile:', profileError);
        throw new Error(`Failed to delete user: ${profileError.message}`);
      }

      console.log('✅ User deleted globally from database');

      // Broadcast deletion event to all components
      broadcastUserDeletion(userId);

      // Refresh data after deletion
      setTimeout(() => {
        refreshUserData();
      }, 1000);

      return { success: true };
    } catch (error) {
      console.error('💥 Error in global user deletion:', error);
      return { success: false, error: error.message };
    }
  }, [broadcastUserDeletion, refreshUserData]);

  // Initialize data on first load
  useEffect(() => {
    if (user && globalUserCache.length === 0) {
      refreshUserData();
    } else if (user) {
      setLoading(false);
    }
  }, [user, refreshUserData]);

  return {
    users,
    userRoles,
    loading,
    refreshUserData,
    deleteUserGlobally,
    isUserAdmin: (userId: string) => userRoles.get(userId) === 'admin',
  };
}; 