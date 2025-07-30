import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      try {
        // Check user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        // Check profiles table for is_admin field
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single();

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error fetching user role:', roleError);
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        const role = roleData?.role || 'user';
        const isAdminFromProfile = profileData?.is_admin || false;

        // User is admin if either user_roles has 'admin' OR profiles has is_admin = true
        const adminStatus = role === 'admin' || isAdminFromProfile;
        const moderatorStatus = role === 'moderator';

        setIsAdmin(adminStatus);
        setIsModerator(moderatorStatus);
        setUserRole(role);

        console.log('🔍 User role check:', {
          userId: user.id,
          role,
          isAdminFromProfile,
          finalIsAdmin: adminStatus,
          isModerator: moderatorStatus
        });

      } catch (error) {
        console.error('Error checking user role:', error);
        setIsAdmin(false);
        setIsModerator(false);
        setUserRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  return {
    isAdmin,
    isModerator,
    userRole,
    isLoading
  };
};