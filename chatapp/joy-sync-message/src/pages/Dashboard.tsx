import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Users, Settings, Crown, UserPlus, UserCheck, UserX, Home, Bell, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuggestionUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());

  // Get display name or fallback to email
  const getDisplayName = () => {
    // First priority: profile display_name
    if (profile?.display_name && profile.display_name !== 'Unknown User') {
      return profile.display_name;
    }
    // Second priority: user metadata full_name
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    // Third priority: email username part (before @)
    if (user?.email) {
      const emailUsername = user.email.split('@')[0];
      // If it's a real name (not just random characters), use it
      if (emailUsername.length > 2 && /[a-zA-Z]/.test(emailUsername)) {
        return emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
      }
    }
    // Last fallback
    return 'User';
  };

  // Helper function to get user display name with fallback
  const getUserDisplayName = (user: any, fallbackName?: string) => {
    if (user?.display_name) {
      return user.display_name;
    }
    if (fallbackName) {
      return fallbackName;
    }
    if (user?.email) {
      // Use the full email instead of just the username part
      return user.email;
    }
    return 'Unknown User';
  };

  // Fetch suggestions (users who are not already friends) - MANDATORY
  const fetchSuggestions = async () => {
    if (!user) {
      console.log('No user found, skipping suggestions fetch');
      return;
    }

    try {
      console.log('🔍 Starting suggestions fetch for user:', user.id);
      setLoading(true);

      // Step 1: Get all users from profiles
      console.log('📊 Fetching all users from profiles...');
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        toast({ 
          title: "Database Error", 
          description: `Failed to fetch users: ${usersError.message}`, 
          variant: "destructive" 
        });
        setSuggestions([]);
        return;
      }

      if (!allUsers || allUsers.length === 0) {
        console.log('⚠️ No users found in database');
        setSuggestions([]);
        return;
      }

      console.log('✅ Found', allUsers.length, 'users in database');
      console.log('👥 Users:', allUsers.map(u => ({ id: u.user_id, name: u.display_name })));

      // Step 2: Get all friend relationships
      console.log('🔗 Fetching friend relationships...');
      const { data: allFriendRelationships, error: friendsError } = await supabase
        .from('friends')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendsError) {
        console.error('❌ Error fetching friend relationships:', friendsError);
        // Continue with empty relationships if there's an error
        console.log('⚠️ Continuing with empty friend relationships');
      }

      console.log('✅ Found', allFriendRelationships?.length || 0, 'friend relationships');
      if (allFriendRelationships) {
        console.log('🔗 Relationships:', allFriendRelationships.map(r => ({
          user: r.user_id,
          friend: r.friend_id,
          status: r.status
        })));
      }

      // Step 3: Create excluded user IDs set
      const excludedUserIds = new Set<string>();
      excludedUserIds.add(user.id); // Always exclude current user
      console.log('🚫 Excluding current user:', user.id);

      // Add all users with any relationship (accepted or pending)
      allFriendRelationships?.forEach(relationship => {
        const otherUserId = relationship.user_id === user.id ? relationship.friend_id : relationship.user_id;
        if (relationship.status === 'accepted' || relationship.status === 'pending') {
          excludedUserIds.add(otherUserId);
          console.log(`🚫 Excluding user ${otherUserId} due to ${relationship.status} relationship`);
        }
      });

      console.log('🚫 Total excluded user IDs:', Array.from(excludedUserIds));

      // Step 4: Filter users who are not in the excluded set
      const filteredUsers = allUsers.filter(user => !excludedUserIds.has(user.user_id));
      console.log('✅ Filtered users for suggestions:', filteredUsers.length);
      console.log('🎯 Suggestions:', filteredUsers.map(u => u.display_name));

      if (filteredUsers.length > 0) {
        const finalSuggestions = filteredUsers.slice(0, 6);
        setSuggestions(finalSuggestions);
        console.log('✅ Set suggestions:', finalSuggestions.map(s => s.display_name));
      } else {
        setSuggestions([]);
        console.log('ℹ️ No suggestions available - user has connected with everyone');
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchSuggestions:', error);
      toast({ 
        title: "Unexpected Error", 
        description: "An unexpected error occurred while loading suggestions", 
        variant: "destructive" 
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
      console.log('🏁 Suggestions fetch completed');
    }
  };

  const sendFriendRequest = async (targetUserId: string, targetUserName: string) => {
    if (!user) return;

    try {
      setSendingRequests(prev => new Set(prev).add(targetUserId));
      
      // Check if friend request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('friends')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing request:', checkError);
      }

      if (existingRequest) {
        if (existingRequest.status === 'accepted') {
          toast({
            title: "Already Friends",
            description: `You are already friends with ${targetUserName}`,
            variant: "default"
          });
          return;
        } else if (existingRequest.status === 'pending') {
          toast({
            title: "Request Pending",
            description: `Friend request to ${targetUserName} is already pending`,
            variant: "default"
          });
          return;
        }
      }

      // Send friend request
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending'
        });

      if (error) {
        console.error('Error sending friend request:', error);
        toast({
          title: "Error",
          description: "Failed to send friend request",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Friend request sent to ${targetUserName}`,
        variant: "default"
      });

      // Remove from suggestions and refresh
      setSuggestions(prev => prev.filter(s => s.user_id !== targetUserId));
      
      // Refresh suggestions after a short delay
      setTimeout(() => {
        fetchSuggestions();
      }, 1000);
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [user]);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container-responsive py-responsive">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-start">
            <div className="text-left">
              <h1 className="text-4xl font-bold italic font-serif bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {getDisplayName()}
              </h1>
              {profile?.bio && ( // Show bio if available
                <p className="text-lg text-muted-foreground italic mt-2">
                  {profile.bio}
                </p>
              )}
            </div>
            {/* Administrator badge removed from this section as per request */}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="px-2 py-3 xs:px-4 xs:py-4 sm:px-6 sm:py-6 hover-responsive cursor-pointer" onClick={() => navigate('/messages')}>
            <CardContent className="flex flex-col xs:flex-row items-center justify-center xs:justify-start gap-2 xs:gap-4 p-0">
              <div className="p-2 bg-blue-100 rounded-full">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-center xs:text-left">
                <h3 className="font-semibold text-sm xs:text-base">Messages</h3>
                <p className="text-xs text-muted-foreground hidden xs:block">View conversations</p>
              </div>
            </CardContent>
          </Card>

          <Card className="px-2 py-3 xs:px-4 xs:py-4 sm:px-6 sm:py-6 hover-responsive cursor-pointer" onClick={() => navigate('/friends')}>
            <CardContent className="flex flex-col xs:flex-row items-center justify-center xs:justify-start gap-2 xs:gap-4 p-0">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-center xs:text-left">
                <h3 className="font-semibold text-sm xs:text-base">Friends</h3>
                <p className="text-xs text-muted-foreground hidden xs:block">Manage connections</p>
              </div>
            </CardContent>
          </Card>

          <Card className="px-2 py-3 xs:px-4 xs:py-4 sm:px-6 sm:py-6 hover-responsive cursor-pointer" onClick={() => navigate('/settings')}>
            <CardContent className="flex flex-col xs:flex-row items-center justify-center xs:justify-start gap-2 xs:gap-4 p-0">
              <div className="p-2 bg-orange-100 rounded-full">
                <Settings className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-center xs:text-left">
                <h3 className="font-semibold text-sm xs:text-base">Settings</h3>
                <p className="text-xs text-muted-foreground hidden xs:block">Customize app</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions Section */}
        <div className="space-responsive">
          <div className="flex-responsive-between">
            <div>
              <h2 className="text-responsive-lg font-semibold mb-2">People You May Know</h2>
              <p className="text-responsive-sm text-muted-foreground">
                Discover new connections and expand your network
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
              disabled={loading}
              className="btn-responsive-sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {loading ? (
            <div className="grid-responsive-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="card-responsive-sm">
                  <CardContent className="flex-responsive-center space-responsive">
                    <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="grid-responsive-2 lg:grid-cols-3">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.user_id} className="card-responsive-sm hover-responsive">
                  <CardContent className="flex-responsive-center space-responsive">
                    <Avatar className="avatar-responsive-base">
                      <AvatarImage src={suggestion.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {getUserDisplayName(suggestion).charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-responsive-base truncate">
                        {getUserDisplayName(suggestion)}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        Suggested for you
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendFriendRequest(suggestion.user_id, getUserDisplayName(suggestion))}
                      disabled={sendingRequests.has(suggestion.user_id)}
                      className="btn-responsive-sm"
                    >
                      {sendingRequests.has(suggestion.user_id) ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          <span className="hidden sm:inline">Sending...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <UserPlus className="h-3 w-3" />
                          <span className="hidden sm:inline">Add</span>
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-responsive">
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-responsive-base mb-2">No Suggestions Available</h3>
                <p className="text-responsive-sm text-muted-foreground mb-4">
                  You've already connected with everyone or there are no new users to suggest.
                </p>
                <Button onClick={fetchSuggestions} className="btn-responsive-base">
                  Refresh Suggestions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-8 space-responsive">
            <div className="flex-responsive-between">
              <div>
                <h2 className="text-responsive-lg font-semibold mb-2 flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span>Admin Panel</span>
                </h2>
                <p className="text-responsive-sm text-muted-foreground">
                  Manage users and monitor system activity
                </p>
              </div>
              <Button
                onClick={() => navigate('/admin')}
                className="btn-responsive-base"
              >
                <Crown className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;