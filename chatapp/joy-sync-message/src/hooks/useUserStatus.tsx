import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStatus {
  is_online: boolean;
  last_seen: string;
  last_activity: string;
}

export const useUserStatus = () => {
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const { user } = useAuth();

  // Get status for a specific user
  const getUserStatus = (userId: string): UserStatus | null => {
    return userStatuses.get(userId) || null;
  };

  // Update current user's activity
  const updateActivity = async () => {
    if (!user) return;

    try {
      await supabase.rpc('update_user_activity', { user_uuid: user.id });
      console.log('📡 Updated user activity');
    } catch (error) {
      console.error('❌ Error updating activity:', error);
    }
  };

  // Set user offline
  const setOffline = async () => {
    if (!user) return;

    try {
      await supabase.rpc('set_user_offline', { user_uuid: user.id });
      console.log('📡 Set user offline');
    } catch (error) {
      console.error('❌ Error setting offline:', error);
    }
  };

  // Fetch all user statuses
  const fetchUserStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, is_online, last_seen, last_activity');

      if (error) {
        console.error('❌ Error fetching user statuses:', error);
        return;
      }

      const statusMap = new Map<string, UserStatus>();
      data?.forEach((profile) => {
        statusMap.set(profile.user_id, {
          is_online: profile.is_online || false,
          last_seen: profile.last_seen || new Date().toISOString(),
          last_activity: profile.last_activity || new Date().toISOString(),
        });
      });

      setUserStatuses(statusMap);
      console.log('📡 Updated user statuses:', statusMap.size, 'users');
    } catch (err) {
      console.error('💥 Error fetching user statuses:', err);
    }
  };

  // Format last seen time
  const formatLastSeen = (lastSeen: string): string => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeenDate.toLocaleDateString();
  };

  // Check if user is online (active within last 5 minutes)
  const isUserOnline = (userId: string): boolean => {
    const status = getUserStatus(userId);
    if (!status) return false;
    
    if (status.is_online) {
      const now = new Date();
      const lastActivity = new Date(status.last_activity);
      const diffMs = now.getTime() - lastActivity.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 5; // Consider online if active within 5 minutes
    }
    
    return false;
  };

  // Set up real-time subscriptions and activity tracking
  useEffect(() => {
    if (!user) return;

    console.log('📡 Setting up user status tracking');

    // Fetch initial statuses
    fetchUserStatuses();

    // Update activity immediately
    updateActivity();

    // Set up activity heartbeat (every 30 seconds)
    const activityInterval = setInterval(updateActivity, 30000);

    // Set up real-time subscription for status changes
    const channel = supabase
      .channel('user-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'is_online=neq.null'
        },
        (payload) => {
          console.log('📡 User status changed:', payload.new);
          fetchUserStatuses(); // Refresh all statuses
        }
      )
      .subscribe();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        updateActivity();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(activityInterval);
      setOffline();
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return {
    getUserStatus,
    isUserOnline,
    formatLastSeen,
    updateActivity,
    setOffline,
    userStatuses,
  };
}; 