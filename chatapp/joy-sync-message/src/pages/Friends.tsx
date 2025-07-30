import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserPlus, UserMinus, Users, UserCheck, Clock, AlertCircle, Database, Settings, MessageCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  user: {
    display_name: string;
    avatar_url?: string;
    email?: string;
  };
  friend: {
    display_name: string;
    avatar_url?: string;
    email?: string;
  };
}

interface User {
  id: string;
  display_name: string;
  avatar_url?: string;
  email?: string;
}

const Friends: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const navigate = useNavigate();

  // Check if friends table exists
  useEffect(() => {
    checkFriendsTable();
  }, []);

  // Fetch current user's profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, email')
        .eq('user_id', user.id)
        .single();
      if (!error && data) {
        setCurrentUserProfile({
          id: data.user_id,
          display_name: data.display_name || 'Unknown User',
          avatar_url: data.avatar_url || null,
          email: data.email || 'No email available',
        });
      }
    };
    fetchProfile();
  }, [user]);

  const checkFriendsTable = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('friends')
        .select('id')
        .limit(1);

      if (error) {
        console.log('Friends table does not exist:', error);
        setTableExists(false);
        toast({
          title: "Database Setup Required",
          description: "Friends system needs to be set up. Please run FIX_FRIENDS_TABLE.sql in Supabase SQL Editor.",
          variant: "destructive"
        });
      } else {
        setTableExists(true);
        if (user) {
          await fetchFriends();
          await fetchPendingRequests();
        }
      }
    } catch (error) {
      console.error('Error checking friends table:', error);
      setTableExists(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch friends and pending requests
  useEffect(() => {
    if (user && tableExists) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user, tableExists]);

  // Get user display name from profiles table (completely generic)
  const getUserDisplayName = (userId: string, profileMap: Map<string, any>): string => {
    // Get from profile map (fetched from database)
    const profile = profileMap.get(userId);
    if (profile?.display_name) {
      return profile.display_name;
    }
    
    // If no profile found, return a generic fallback
    return 'Unknown User';
  };

  // Fetch friends using the new helper function
  const fetchFriends = async () => {
    if (!user) return;

    try {
      console.log('Fetching friends for user:', user.id);
      
      // Use the new helper function for better efficiency
      const { data: friendsData, error: friendsError } = await supabase
        .rpc('get_user_friends', { user_uuid: user.id });

      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
        // Fallback to direct query with profile data
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('friends')
          .select(`
            id, 
            user_id, 
            friend_id, 
            status, 
            created_at,
            profiles!friends_user_id_fkey(display_name, email),
            profiles!friends_friend_id_fkey(display_name, email)
          `)
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return;
        }

        // Process fallback data with profile information
        const processedFriends = fallbackData?.map(f => {
          const isCurrentUserUser = f.user_id === user.id;
          const otherUserId = isCurrentUserUser ? f.friend_id : f.user_id;
          const otherUserProfile = isCurrentUserUser 
            ? f.profiles_friends_friend_id_fkey 
            : f.profiles_friends_user_id_fkey;
          
          return {
            id: f.id,
            user_id: f.user_id,
            friend_id: f.friend_id,
            status: f.status,
            created_at: f.created_at,
            user: {
              display_name: otherUserProfile?.display_name || 'Unknown User',
              avatar_url: null,
              email: otherUserProfile?.email || 'No email available',
            },
            friend: {
              display_name: otherUserProfile?.display_name || 'Unknown User',
              avatar_url: null,
              email: otherUserProfile?.email || 'No email available',
            }
          };
        }) || [];

        setFriends(processedFriends);
        return;
      }

      // Process friends data from helper function
      // Always show the other user's (friend's) real name and email
      const processedFriends = friendsData?.map(f => {
        return {
          id: f.friend_id,
          user_id: user.id,
          friend_id: f.friend_id,
          status: f.status,
          created_at: f.created_at,
          user: {
            display_name: f.friend_name || 'Unknown User',
            avatar_url: null,
            email: f.friend_email || 'No email available',
          },
          friend: {
            display_name: f.friend_name || 'Unknown User',
            avatar_url: null,
            email: f.friend_email || 'No email available',
          }
        };
      }) || [];

      console.log('Processed friends:', processedFriends);
      setFriends(processedFriends);
    } catch (error) {
      console.error('Error in fetchFriends:', error);
    }
  };

  // Fetch pending requests using the new helper function
  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      console.log('Fetching pending requests for user:', user.id);
      
      // Use the new helper function for better efficiency
      const { data: pendingData, error: pendingError } = await supabase
        .rpc('get_pending_friend_requests', { user_uuid: user.id });

      if (pendingError) {
        console.error('Error fetching pending requests:', pendingError);
        // Fallback to direct query with profile data
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('friends')
          .select(`
            id, 
            user_id, 
            friend_id, 
            status, 
            created_at,
            profiles!friends_user_id_fkey(display_name, email)
          `)
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return;
        }

        // Process fallback data with profile information
        const processedRequests = fallbackData?.map(f => {
          const requesterProfile = f.profiles_friends_user_id_fkey;
          
          return {
            id: f.id,
            user_id: f.user_id,
            friend_id: f.friend_id,
            status: f.status,
            created_at: f.created_at,
            user: {
              display_name: requesterProfile?.display_name || 'Unknown User',
              avatar_url: null,
              email: requesterProfile?.email || 'No email available',
            },
            friend: {
              display_name: currentUserProfile?.display_name || 'Unknown User',
              avatar_url: currentUserProfile?.avatar_url || null,
              email: currentUserProfile?.email || 'No email available',
            }
          };
        }) || [];

        setPendingRequests(processedRequests);
        return;
      }

      // Process pending requests data from helper function
      // Use currentUserProfile for the current user
      const processedRequests = pendingData?.map(p => ({
        id: p.request_id,
        user_id: p.requester_id,
        friend_id: user.id,
        status: p.status,
        created_at: p.created_at,
        user: {
          display_name: p.requester_name || 'Unknown User',
          avatar_url: null,
          email: p.requester_email
        },
        friend: {
          display_name: currentUserProfile?.display_name || 'Unknown User',
          avatar_url: currentUserProfile?.avatar_url || null,
          email: currentUserProfile?.email || 'No email available',
        }
      })) || [];

      console.log('Processed pending requests:', processedRequests);
      setPendingRequests(processedRequests);
    } catch (error) {
      console.error('Error in fetchPendingRequests:', error);
    }
  };

  // Search users with improved efficiency
  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      console.log('Searching for users with query:', query);

      // Search in profiles table with better query
      const { data: searchData, error: searchError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, email')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (searchError) {
        console.error('Error searching users:', searchError);
        setSearchResults([]);
        return;
      }

      console.log('Search results:', searchData);

      // Filter out users who are already friends or have pending requests
      const { data: existingRelationships, error: relationshipsError } = await supabase
        .from('friends')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (relationshipsError) {
        console.error('Error fetching existing relationships:', relationshipsError);
      }

      // Create a set of excluded user IDs
      const excludedUserIds = new Set<string>();
      existingRelationships?.forEach(rel => {
        const otherUserId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
        if (rel.status === 'accepted' || rel.status === 'pending') {
          excludedUserIds.add(otherUserId);
        }
      });

      // Filter search results
      const filteredResults = searchData?.filter(user => !excludedUserIds.has(user.user_id)) || [];

      // Map to User interface
      const mappedResults: User[] = filteredResults.map(user => ({
        id: user.user_id,
        display_name: user.display_name || 'Unknown User',
        avatar_url: user.avatar_url,
        email: user.email || 'No email available'
      }));

      console.log('Filtered search results:', mappedResults);
      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Error in searchUsers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!tableExists) {
      toast({
        title: "Database Setup Required",
        description: "Please run FIX_FRIENDS_TABLE.sql in Supabase SQL Editor first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user?.id,
          friend_id: friendId,
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
        description: "Friend request sent successfully"
      });

      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== friendId));
      setSearchQuery('');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!tableExists) return;

    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) {
        console.error('Error accepting friend request:', error);
        toast({
          title: "Error",
          description: "Failed to accept friend request",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Friend request accepted"
      });

      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    if (!tableExists) return;

    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting friend request:', error);
        toast({
          title: "Error",
          description: "Failed to reject friend request",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Friend request rejected"
      });

      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive"
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!tableExists) return;

    try {
      console.log('🗑️ Removing friend:', friendId);
      
      // Delete the friendship record where either user_id or friend_id matches
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`);

      if (error) {
        console.error('Error removing friend:', error);
        toast({
          title: "Error",
          description: "Failed to remove friend",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Friend removed successfully');
      toast({
        title: "Success",
        description: "Friend removed successfully"
      });

      // Refresh the friends list
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive"
      });
    }
  };

  const getFriendDisplayName = (friend: Friend) => {
    // Always return the friend's display name (not the current user's)
    return friend.friend.display_name;
  };

  const getFriendEmail = (friend: Friend) => {
    // Always return the friend's email (not the current user's)
    return friend.friend.email || 'No email available';
  };

  const getFriendAvatar = (friend: Friend) => {
    // Always return the friend's avatar (not the current user's)
    return friend.friend.avatar_url;
  };

  // Show setup message if table doesn't exist
  if (tableExists === false) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Friends
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect with other users and manage your friend requests
          </p>
        </div>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Database className="w-5 h-5" />
              Database Setup Required
            </CardTitle>
            <CardDescription className="text-red-700">
              The friends system needs to be set up in your database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                To enable the friends feature, you need to run the database setup script.
              </p>
              
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-red-700 space-y-1">
                  <li>1. Go to your Supabase Dashboard</li>
                  <li>2. Open the SQL Editor</li>
                  <li>3. Copy the contents of <code className="bg-red-100 px-1 rounded">FIX_FRIENDS_TABLE.sql</code></li>
                  <li>4. Paste and run the script</li>
                  <li>5. Refresh this page</li>
                </ol>
              </div>

              <Button 
                onClick={checkFriendsTable}
                className="bg-red-600 hover:bg-red-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug information
  console.log('🔍 Friends Debug Info:', {
    tableExists,
    friendsCount: friends.length,
    pendingCount: pendingRequests.length,
    activeTab,
    user: user?.id
  });

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="container-responsive py-responsive">
          <div className="mb-8">
            <h1 className="text-responsive-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-center sm:text-left">
              Friends
            </h1>
            <p className="text-responsive-base text-muted-foreground text-center sm:text-left mt-2">
              Loading friends system...
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container-responsive py-responsive">
        <div className="mb-8">
          <div className="flex-responsive-between items-center">
            <div>
              <h1 className="text-responsive-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent text-center sm:text-left">
                Friends
              </h1>
              <p className="text-responsive-base text-muted-foreground text-center sm:text-left mt-2">
                Connect with other users and manage your friend requests
              </p>
            </div>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
                <Users className="h-4 w-4" />
                <span className="font-medium">{friends.length} Friends</span>
              </Badge>
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-2 px-3 py-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{pendingRequests.length} Pending</span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-responsive">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="friends" className="flex items-center gap-2 text-sm xs:text-base py-2">
              <Users className="w-4 h-4 xs:w-5 xs:h-5" />
              <span className="hidden xs:inline">Friends ({friends.length})</span>
              <span className="inline xs:hidden">({friends.length})</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 text-sm xs:text-base py-2 relative">
              <Clock className="w-4 h-4 xs:w-5 xs:h-5" />
              <span className="hidden xs:inline">Requests</span>
              <span className="inline xs:hidden">({pendingRequests.length})</span>
              {pendingRequests.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 xs:h-5 xs:w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                >
                  {pendingRequests.length > 99 ? '99+' : pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2 text-sm xs:text-base py-2">
              <Search className="w-4 h-4 xs:w-5 xs:h-5" />
              <span className="hidden xs:inline">Find Friends</span>
              <span className="inline xs:hidden">Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-responsive">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-responsive-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                  Your Friends
                </CardTitle>
                <CardDescription className="text-responsive-base">
                  People you're connected with
                </CardDescription>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-responsive-base text-muted-foreground">No friends yet. Start by searching for users!</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-purple-100 hover:border-purple-200 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="avatar-responsive-base">
                              <AvatarImage src={getFriendAvatar(friend)} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                {getFriendDisplayName(friend)?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-responsive-base truncate">{getFriendDisplayName(friend)}</p>
                              <p className="text-responsive-sm text-muted-foreground truncate">{getFriendEmail(friend)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => navigate('/chat', {
                                state: {
                                  chatWith: friend.friend_id,
                                  chatWithName: getFriendDisplayName(friend)
                                }
                              })}
                              className="bg-green-600 hover:bg-green-700 text-white p-2 h-auto text-sm sm:text-base btn-responsive-sm"
                            >
                              <MessageCircle className="w-4 h-4 xs:w-5 xs:h-5" />
                              <span className="hidden xs:inline">Start Chat</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 h-auto text-sm sm:text-base btn-responsive-sm">
                                  <UserMinus className="w-4 h-4 xs:w-5 xs:h-5" />
                                  <span className="hidden xs:inline">Remove</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="modal-responsive-content">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {getFriendDisplayName(friend)} from your friends list?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeFriend(friend.user_id === user?.id ? friend.friend_id : friend.user_id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-responsive">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-responsive-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Pending Requests
                </CardTitle>
                <CardDescription className="text-responsive-base">
                  Friend requests waiting for your response
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-responsive-base text-muted-foreground">No pending friend requests</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-100 hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="avatar-responsive-base">
                              <AvatarImage src={request.user.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                                {request.user.display_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-responsive-base truncate">{request.user.display_name}</p>
                              <p className="text-responsive-sm text-muted-foreground truncate">{request.user.email || 'No email'}</p>
                              <Badge variant="secondary" className="mt-1 badge-responsive">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => acceptFriendRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700 p-2 h-auto text-sm sm:text-base btn-responsive-sm"
                            >
                              <UserCheck className="w-4 h-4 xs:w-5 xs:h-5" />
                              <span className="hidden xs:inline">Accept</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectFriendRequest(request.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 h-auto text-sm sm:text-base btn-responsive-sm"
                            >
                              <UserMinus className="w-4 h-4 xs:w-5 xs:h-5" />
                              <span className="hidden xs:inline">Reject</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-responsive">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-responsive-lg">
                  <Search className="w-5 h-5 text-green-600" />
                  Find Friends
                </CardTitle>
                <CardDescription className="text-responsive-base">
                  Search for users to add as friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-responsive">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="flex-1 input-responsive"
                    />
                  </div>

                  {isSearching && (
                    <div className="text-center py-4">
                      <p className="text-responsive-base text-muted-foreground">Searching...</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {searchResults.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100 hover:border-green-200 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="avatar-responsive-base">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                                  {user.display_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-responsive-base truncate">{user.display_name}</p>
                                <p className="text-responsive-sm text-muted-foreground truncate">{user.email || 'No email'}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => sendFriendRequest(user.id)}
                              className="bg-green-600 hover:bg-green-700 p-2 h-auto text-sm sm:text-base btn-responsive-sm flex-shrink-0"
                            >
                              <UserPlus className="w-4 h-4 xs:w-5 xs:h-5" />
                              <span className="hidden xs:inline">Add Friend</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-responsive-base text-muted-foreground">No users found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends; 