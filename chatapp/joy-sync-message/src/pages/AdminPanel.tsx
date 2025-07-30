import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Mail, User, Crown, CheckCircle, Shield, RefreshCw, AlertCircle, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  user_id: string;
  email: string;
  display_name: string;
  created_at: string;
  is_admin?: boolean;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 AdminPanel mounted');
    console.log('🔍 User:', user?.email);
    console.log('🔍 IsAdmin:', isAdmin);
    console.log('🔍 User ID:', user?.id);
    
    // Load users immediately
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching all users for admin panel...');
      
      // Simple direct fetch from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          email,
          created_at,
          is_admin
        `)
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('❌ Profiles query failed:', profilesError);
        setError(`Database error: ${profilesError.message}`);
        toast({
          title: "Database Error",
          description: "Please run FINAL_FIX.sql in Supabase SQL Editor to fix this issue.",
          variant: "destructive",
        });
        return;
      }
      
      if (!profiles || profiles.length === 0) {
        console.log('📭 No profiles found');
        setUsers([]);
        toast({
          title: "No Users Found",
          description: "No user profiles found. Please run FINAL_FIX.sql in Supabase SQL Editor.",
          variant: "destructive",
        });
        return;
      }
      
      // Process profiles into user data
      const userData = profiles.map((profile: any) => ({
        user_id: profile.user_id,
        email: profile.email || 'No email available',
        display_name: profile.display_name || 'Unknown User',
        created_at: profile.created_at,
        is_admin: profile.is_admin || false
      }));

      console.log('✅ Successfully fetched profiles:', profiles.length);
      console.log('📊 User data:', userData.map(u => ({ 
        display_name: u.display_name, 
        email: u.email,
        is_admin: u.is_admin 
      })));

      setUsers(userData);
      
      toast({
        title: "Users Loaded",
        description: `Successfully loaded ${userData.length} users.`,
      });
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to fetch users: ${errorMessage}`);
      
      toast({
        title: "Error",
        description: `Failed to load users: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Simple filtering
  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('🔍 AdminPanel render - loading:', loading, 'users:', users.length, 'error:', error);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header with gradient */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  Admin Panel
                </h1>
                <p className="text-slate-600">
                  Manage all users in the system
                </p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Admin Panel Active
              </CardTitle>
              <CardDescription className="text-green-700">
                You can now view all users in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Current User:</span>
                  <span className="text-slate-600 truncate">{user?.email || 'No user'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Admin Status:</span>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                    {isAdmin ? 'Admin' : 'User'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Users Found:</span>
                  <span className="text-slate-600">{users.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button 
              onClick={fetchAllUsers} 
              disabled={loading}
              variant="outline"
              className="w-full sm:w-auto hover:bg-slate-100 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  🔄 Refresh Users ({users.length} found)
                </>
              )}
            </Button>
            {error && (
              <Button 
                onClick={() => setError(null)} 
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto"
              >
                Clear Error
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-semibold">Error:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          </div>

          {/* Users List */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Users className="h-5 w-5 text-primary" />
                All Users ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 animate-spin opacity-50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-700">Loading Users...</h3>
                  <p className="text-sm text-slate-500">
                    Fetching user data from the database
                  </p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-10 w-10 opacity-50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-700">No Users Found</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    {searchTerm ? 'No users found matching your search' : 'No users found in the system'}
                  </p>
                  {users.length === 0 && (
                    <Button onClick={fetchAllUsers} className="mt-4">
                      Load Users
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((userData) => (
                    <div key={userData.user_id} className="p-4 hover:bg-slate-50/80 transition-all duration-200 border-l-4 border-transparent hover:border-primary/30">
                      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        {/* User Avatar */}
                        <div className="relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-slate-100">
                            <User className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                          </div>
                          {userData.is_admin && (
                            <div className="absolute -top-1 -right-1" title="Admin">
                              <Crown className="h-3 w-3 text-yellow-500 bg-white rounded-full p-0.5" />
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0 break-words">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">
                              {userData.display_name}
                            </h3>
                            {userData.user_id === user?.id && (
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                You
                              </Badge>
                            )}
                            {userData.is_admin && (
                              <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <p className="text-xs sm:text-sm text-slate-600 truncate">
                              {userData.email}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                          <Button size="sm" variant="outline" className="w-full sm:w-auto">
                            <Shield className="h-4 w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Edit Role</span>
                          </Button>
                          <Button size="sm" variant="destructive" className="w-full sm:w-auto">
                            <UserMinus className="h-4 w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 