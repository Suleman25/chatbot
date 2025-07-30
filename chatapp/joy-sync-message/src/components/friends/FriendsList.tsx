import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, UserCheck, UserX, Clock, Crown, Loader2 } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const FriendsList = () => {
  const { friends, friendRequests, loading, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriends();
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStartChat = (userId: string, displayName: string | null) => {
    navigate('/messages', { 
      state: { 
        chatWith: userId,
        chatWithName: displayName 
      } 
    });
  };

  const getInitials = (name: string | null, userId: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userId.substring(0, 2).toUpperCase();
  };

  const isUserAdmin = (userId: string): boolean => {
    return userRoles.get(userId) === 'admin';
  };

  // Fetch user roles
  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user roles:', error);
        return;
      }

      const rolesMap = new Map<string, string>();
      if (data) {
        data.forEach((roleData) => {
          rolesMap.set(roleData.user_id, roleData.role);
        });
      }
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  useEffect(() => {
    fetchUserRoles();
  }, []);

  if (loading) {
    return (
      <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading friends...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg text-slate-800">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="flex-1 min-w-0">Friend Requests</span>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20">{friendRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {friendRequests.map((request) => {
                const isUserAnAdmin = isUserAdmin(request.requester_id);
                
                return (
                  <div 
                    key={request.request_id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={request.requester_avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                          {getInitials(request.requester_display_name, request.requester_id)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <p className="font-semibold truncate text-sm sm:text-base">
                            {request.requester_display_name || 'Anonymous User'}
                          </p>
                          
                          {isUserAnAdmin && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1 px-2 py-0.5 w-fit">
                              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>Admin</span>
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center flex-wrap sm:flex-nowrap">
                      <Button
                        onClick={async () => {
                          setProcessingRequest(request.request_id);
                          try {
                            await acceptFriendRequest(request.request_id);
                          } finally {
                            setProcessingRequest(null);
                          }
                        }}
                        disabled={processingRequest === request.request_id || loading}
                        variant="default"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        {processingRequest === request.request_id ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        <span>{processingRequest === request.request_id ? 'Accepting...' : 'Accept'}</span>
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          setProcessingRequest(request.request_id);
                          try {
                            await rejectFriendRequest(request.request_id);
                          } finally {
                            setProcessingRequest(null);
                          }
                        }}
                        disabled={processingRequest === request.request_id || loading}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        {processingRequest === request.request_id ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        <span>{processingRequest === request.request_id ? 'Rejecting...' : 'Reject'}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="flex-1 min-w-0">Your Friends</span>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">{friends.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Friends Yet</h3>
              <p className="text-xs sm:text-sm mb-3 sm:mb-4">
                Start building your network by finding and adding people!
              </p>
              <p className="text-xs text-muted-foreground">
                Use the "Find People" tab to discover and connect with others.
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {friends.map((friend) => {
                const isUserAnAdmin = isUserAdmin(friend.friend_user_id);
                
                return (
                  <div 
                    key={friend.friendship_id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={friend.friend_avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                          {getInitials(friend.friend_display_name, friend.friend_user_id)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <p className="font-semibold truncate text-sm sm:text-base">
                            {friend.friend_display_name || 'Anonymous User'}
                          </p>
                          
                          {isUserAnAdmin && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1 px-2 py-0.5 w-fit">
                              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span>Admin</span>
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          Friends since {new Date(friend.friendship_created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center flex-wrap sm:flex-nowrap">
                      <Button
                        onClick={() => handleStartChat(friend.friend_user_id, friend.friend_display_name || null)}
                        variant="default"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Chat</span>
                      </Button>
                      
                      <Button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${friend.friend_display_name || 'this friend'}?`)) {
                            removeFriend(friend.friend_user_id);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 