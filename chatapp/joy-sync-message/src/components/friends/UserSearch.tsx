import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, UserPlus, Users, Circle, Trash2, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export const UserSearch = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [sendingFriendRequest, setSendingFriendRequest] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { isUserOnline, formatLastSeen, getUserStatus } = useUserStatus();
  const { friends, sendFriendRequest } = useFriends();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Memoize filtered users to prevent unnecessary recalculations
  const filteredUsers = useMemo(() => {
    if (searchQuery.trim() === '') {
      return users;
    }
    return users.filter(userProfile => {
      const name = userProfile.display_name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, users]);

  // Check if a user is already a friend
  const isUserAlreadyFriend = useCallback((userId: string) => {
    return friends.some(friend => friend.friend_user_id === userId);
  }, [friends]);

  // Fetch unread message counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data: unreadData } = await supabase.rpc('get_all_unread_counts');
      
      const countsMap = new Map<string, number>();
      if (unreadData) {
        unreadData.forEach((item: any) => {
          countsMap.set(item.sender_id, item.unread_count);
        });
      }
      
      setUnreadCounts(countsMap);
    } catch (error) {
      console.error('❌ Error fetching unread counts:', error);
    }
  }, []);

  // Get unread count for a specific user
  const getUnreadCount = useCallback((userId: string) => {
    return unreadCounts.get(userId) || 0;
  }, [unreadCounts]);

  const getInitials = useCallback((name: string | null, userId: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userId?.substring(0, 2).toUpperCase() || 'U';
  }, []);

  const isUserAdmin = useCallback((userId: string): boolean => {
    return userRoles.get(userId) === 'admin';
  }, [userRoles]);

  // Fetch user roles
  const fetchUserRoles = useCallback(async () => {
    try {
      console.log('🔍 Fetching user roles...');
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching user roles:', error);
        return;
      }

      const rolesMap = new Map<string, string>();
      if (data) {
        data.forEach((roleData) => {
          rolesMap.set(roleData.user_id, roleData.role);
        });
      }
      console.log('✅ User roles fetched:', rolesMap.size, 'roles');
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('💥 Error fetching user roles:', error);
    }
  }, []);

  // Fetch all users (excluding current user)
  const fetchUsers = useCallback(async () => {
    if (!user) {
      console.log('❌ No user found, skipping users fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching users... Current user ID:', user.id);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, created_at')
        .neq('user_id', user.id) // CRITICAL: Exclude current user
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
        setUsers([]);
      } else {
        // Double-check: ensure current user is not in the results
        const userList = (profiles || []).filter(profile => profile.user_id !== user.id);
        
        console.log('✅ Users fetched successfully:', userList.length, 'users');
        setUsers(userList);
      }
    } catch (err) {
      console.error('💥 Unexpected error fetching users:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch users and roles on component mount and when user changes
  useEffect(() => {
    if (user) {
      console.log('🔄 UserSearch initializing for user:', user.id);
      fetchUsers();
      fetchUserRoles();
      fetchUnreadCounts(); // Fetch unread counts on mount
    }
  }, [user, fetchUsers, fetchUserRoles, fetchUnreadCounts]);

  const handleStartChat = useCallback((userProfile: UserProfile) => {
    console.log('💬 Starting chat with user:', userProfile.user_id, userProfile.display_name);
    navigate('/messages', {
      state: {
        chatWith: userProfile.user_id,
        chatWithName: userProfile.display_name
      }
    });
  }, [navigate]);

  // Use the proper sendFriendRequest function from useFriends hook
  const handleAddFriend = useCallback(async (friendId: string) => {
    console.log('🚀 UserSearch: handleAddFriend called for:', friendId);
    
    if (!user) {
      console.error('❌ UserSearch: No user found');
      toast({
        title: "Authentication Error",
        description: "Please sign in to send friend requests",
        variant: "destructive",
      });
      return;
    }

    if (friendId === user.id) {
      console.error('❌ UserSearch: User trying to add themselves');
      toast({
        title: "Invalid Action",
        description: "You cannot send a friend request to yourself",
        variant: "destructive",
      });
      return;
    }

    setSendingFriendRequest(friendId);
    
    try {
      console.log('📤 UserSearch: Calling sendFriendRequest...');
      await sendFriendRequest(friendId);
      console.log('✅ UserSearch: Friend request function completed');
      // Success/error toasts are already handled by the useFriends hook
    } catch (err) {
      console.error('💥 UserSearch: Unexpected error in handleAddFriend:', err);
      // Error is already handled by useFriends hook, just log it here
    } finally {
      setSendingFriendRequest(null);
    }
  }, [user, sendFriendRequest, toast]);

  const handleRemoveUser = useCallback(async (userProfile: UserProfile) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can remove users",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to permanently remove ${userProfile.display_name || 'this user'}? This action cannot be undone.`)) {
      return;
    }

    setRemoving(userProfile.user_id);

    try {
      console.log('🗑️ Admin removing user:', userProfile.user_id, userProfile.display_name);

      // Try using the admin function first (most reliable)
      console.log('🔧 Attempting deletion using admin function...');
      
      try {
        const { data: functionResult, error: functionError } = await supabase
          .rpc('admin_complete_user_deletion', {
            target_user_id: userProfile.user_id
          });

        if (functionError) {
          console.warn('⚠️ Admin function failed:', functionError);
          throw new Error(`Admin function failed: ${functionError.message}`);
        }

        if (functionResult && functionResult.length > 0) {
          const result = functionResult[0];
          console.log('📊 Admin function result:', result);
          
          if (result.success) {
            console.log('✅ User deleted successfully via admin function');
            
            // Immediate UI update
            const updatedUsers = users.filter(u => u.user_id !== userProfile.user_id);
            setUsers(updatedUsers);

            // Clear user from roles cache
            const updatedRoles = new Map(userRoles);
            updatedRoles.delete(userProfile.user_id);
            setUserRoles(updatedRoles);

            toast({
              title: "User Removed",
              description: `${userProfile.display_name || 'User'} has been permanently removed from the platform`,
            });

            return;
          } else {
            console.error('❌ Admin function returned failure:', result.message);
            throw new Error(result.message || 'Admin function returned failure');
          }
        }
      } catch (adminFuncError) {
        console.warn('⚠️ Admin function approach failed, trying manual deletion...', adminFuncError);
        
        // Manual deletion approach
        console.log('🔧 Attempting manual user deletion...');
        
        // Delete from profiles table (this is usually the RLS-protected one)
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userProfile.user_id);

        if (profileError) {
          console.error('❌ CRITICAL: Error deleting user profile:', profileError);
          
          if (profileError.code === 'PGRST301') {
            toast({
              title: "Permission Denied", 
              description: "RLS policies are preventing user deletion. Admin permissions may need to be updated in the database.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Deletion Failed", 
              description: `Failed to remove user profile: ${profileError.message}. User may reappear.`,
              variant: "destructive",
            });
          }
          return;
        }

        console.log('✅ User profile deleted successfully via manual deletion');
        
        // Immediate UI update for manual deletion
        const updatedUsers = users.filter(u => u.user_id !== userProfile.user_id);
        setUsers(updatedUsers);

        // Clear user from roles cache
        const updatedRoles = new Map(userRoles);
        updatedRoles.delete(userProfile.user_id);
        setUserRoles(updatedRoles);

        toast({
          title: "User Removed",
          description: `${userProfile.display_name || 'User'} has been permanently removed from the platform`,
        });
      }

    } catch (err) {
      console.error('💥 Critical error removing user:', err);
      toast({
        title: "Deletion Error",
        description: `Critical error occurred: ${err.message}. User may not be fully deleted.`,
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  }, [isAdmin, users, userRoles, toast]);

  if (loading) {
    return (
      <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Removed excessive debug console.logs that fire on every render
  // console.log('🎯 UserSearch render - Current user:', user?.id);
  // console.log('🎯 UserSearch render - Total users:', users.length);
  // console.log('🎯 UserSearch render - Filtered users:', filteredUsers.length);
  // console.log('🎯 UserSearch render - User IDs:', filteredUsers.map(u => u.user_id));

  return (
    <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 flex-wrap text-slate-800">
          <Search className="h-5 w-5 text-primary" />
          <span className="flex-1 min-w-0">Find People</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{filteredUsers.length} users</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
            {searchQuery ? (
              <>
                <p className="text-sm sm:text-base">No users found matching "{searchQuery}".</p>
                <p className="text-xs sm:text-sm mt-1">Try a different search term.</p>
              </>
            ) : (
              <>
                <p className="text-sm sm:text-base">No other users found.</p>
                <p className="text-xs sm:text-sm mt-1">Invite people to join Joy Sync Chat!</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.map((userProfile) => {
              const userStatus = getUserStatus(userProfile.user_id);
              const userIsOnline = isUserOnline(userProfile.user_id);
              const isRemoving = removing === userProfile.user_id;
              const isSendingRequest = sendingFriendRequest === userProfile.user_id;
              const isUserAnAdmin = isUserAdmin(userProfile.user_id);
              const unreadCount = getUnreadCount(userProfile.user_id);
              
              // Safety check: never render current user
              if (userProfile.user_id === user?.id) {
                console.warn('⚠️ Current user found in results, skipping:', userProfile.user_id);
                return null;
              }

              return (
                <div 
                  key={userProfile.user_id} 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* User Info Section */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={userProfile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                          {getInitials(userProfile.display_name, userProfile.user_id)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Unread Message Count Badge */}
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1">
                          <Badge variant="destructive" className="text-xs h-5 min-w-[20px] px-1 text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Admin Crown Overlay */}
                      {isUserAnAdmin && (
                        <div className="absolute -top-1 -left-1">
                          <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 bg-background rounded-full p-0.5" title="Admin" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <p className="font-semibold truncate text-sm sm:text-base">
                          {userProfile.display_name || 'Anonymous User'}
                        </p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUserAnAdmin && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1 px-2 py-0.5">
                              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="text-xs">Admin</span>
                            </Badge>
                          )}
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Circle className={`h-1.5 w-1.5 sm:h-2 sm:w-2 fill-current ${
                              userIsOnline ? 'text-green-500' : 'text-gray-400'
                            }`} />
                            <span className="text-xs">
                              {userIsOnline ? 'Online' : formatLastSeen(userStatus?.last_seen)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Joined {new Date(userProfile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center flex-wrap sm:flex-nowrap">
                    <Button
                      onClick={() => handleStartChat(userProfile)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none min-w-0"
                    >
                      <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Chat</span>
                    </Button>
                    
                    {/* Only show Add Friend button if user is not already a friend */}
                    {!isUserAlreadyFriend(userProfile.user_id) && (
                      <Button
                        onClick={() => handleAddFriend(userProfile.user_id)}
                        variant="default"
                        size="sm"
                        disabled={isSendingRequest}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none min-w-0"
                      >
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        {isSendingRequest ? (
                          <span>Sending...</span>
                        ) : (
                          <span>Add Friend</span>
                        )}
                      </Button>
                    )}

                    {/* Show "Already Friends" indicator if they are friends */}
                    {isUserAlreadyFriend(userProfile.user_id) && (
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        <Users className="h-3 w-3 mr-1" />
                        Friends
                      </Badge>
                    )}
                    
                    {isAdmin && (
                      <Button
                        onClick={() => handleRemoveUser(userProfile)}
                        variant="destructive"
                        size="sm"
                        disabled={isRemoving}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none min-w-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        {isRemoving ? (
                          <span>Removing...</span>
                        ) : (
                          <span className="hidden sm:inline">Remove</span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 