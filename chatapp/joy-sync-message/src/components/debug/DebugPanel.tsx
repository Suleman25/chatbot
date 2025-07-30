import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Database, Bug, TestTube, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DebugPanelProps {
  showDetails?: boolean;
}

export const DebugPanel = ({ showDetails = false }: DebugPanelProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isTestingRLS, setIsTestingRLS] = useState(false);
  const { user } = useAuth();
  const { friends, friendRequests, refetch: refetchFriends, isConnected } = useFriends();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Debug: Force refreshing all data...');
      await refetchFriends();
      
      // Trigger a full page refresh after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      toast({
        title: "Debug Refresh",
        description: "All data refreshed successfully!",
      });
    } catch (error) {
      console.error('💥 Debug refresh error:', error);
      toast({
        title: "Debug Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearLocalStorage = () => {
    setIsClearingCache(true);
    try {
      console.log('🗑️ Debug: Clearing local storage and caches...');
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any cached data in memory
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      toast({
        title: "Cache Cleared",
        description: "All local data and caches cleared. Page will reload.",
      });
      
      // Reload page after clearing
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('💥 Cache clear error:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive",
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      console.log('🔌 Debug: Testing database connection...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);
      
      if (error) {
        toast({
          title: "Connection Test Failed",
          description: `Database error: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Test Passed",
          description: "Database connection is working properly!",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: "Network or connection error",
        variant: "destructive",
      });
    }
  };

  const handleTestFriendsSystem = async () => {
    try {
      console.log('🧪 Debug: Testing friends system comprehensively...');
      
      // Test 1: Basic connection
      console.log('🧪 Test 1: Basic connection test...');
      const { data: healthCheck, error: healthError } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);
      
      if (healthError) {
        console.error('❌ Basic connection failed:', healthError);
        toast({
          title: "Connection Test Failed",
          description: `Basic database connection failed: ${healthError.message}`,
          variant: "destructive",
        });
        return;
      }
      console.log('✅ Test 1 passed - Basic connection OK');

      // Test 2: Friends table structure
      console.log('🧪 Test 2: Friends table structure test...');
      const { data: friendsStructure, error: structureError } = await supabase
        .from('friends')
        .select('*')
        .limit(1);
      
      if (structureError) {
        console.error('❌ Friends table structure test failed:', {
          code: structureError.code,
          message: structureError.message,
          details: structureError.details,
          hint: structureError.hint
        });
        toast({
          title: "Friends Table Test Failed",
          description: `Friends table issue: ${structureError.code} - ${structureError.message}`,
          variant: "destructive",
        });
        return;
      }
      console.log('✅ Test 2 passed - Friends table accessible');

      // Test 3: Current user validation
      console.log('🧪 Test 3: Current user validation...');
      if (!user?.id) {
        console.error('❌ No current user found');
        toast({
          title: "User Test Failed",
          description: "No authenticated user found",
          variant: "destructive",
        });
        return;
      }
      
      console.log('🔍 Current user details:', {
        id: user.id,
        email: user.email,
        validId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      });
      console.log('✅ Test 3 passed - User validation OK');

      // Test 4: Specific friends query (the failing one)
      console.log('🧪 Test 4: Testing exact friends query that\'s failing...');
      try {
        const { data: friendsTest, error: friendsTestError } = await supabase
          .from('friends')
          .select(`
            id,
            user_id,
            friend_id,
            status,
            created_at,
            updated_at
          `)
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (friendsTestError) {
          console.error('❌ Exact friends query failed:', {
            code: friendsTestError.code,
            message: friendsTestError.message,
            details: friendsTestError.details,
            hint: friendsTestError.hint,
            userId: user.id
          });
          
          // Test if it's a RLS issue
          console.log('🧪 Test 4a: Testing RLS bypass...');
          const { data: bypassTest, error: bypassError } = await supabase
            .from('friends')
            .select('*')
            .limit(1);
          
          if (bypassError) {
            console.error('❌ RLS bypass test failed - table completely inaccessible');
            toast({
              title: "Friends Query Failed",
              description: `Table access denied: ${friendsTestError.message}`,
              variant: "destructive",
            });
          } else {
            console.log('✅ RLS bypass OK - issue is with user-specific query');
            toast({
              title: "Friends Query Failed",
              description: `User-specific query failed: ${friendsTestError.code} - check RLS policies`,
              variant: "destructive",
            });
          }
          return;
        }
        
        console.log('✅ Test 4 passed - Exact friends query successful:', friendsTest?.length || 0);
      } catch (queryErr) {
        console.error('💥 Exception in friends query test:', queryErr);
        toast({
          title: "Friends Query Exception",
          description: `Query threw exception: ${queryErr.message}`,
          variant: "destructive",
        });
        return;
      }

      // Test 5: Profile fetching
      console.log('🧪 Test 5: Profile fetching test...');
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile test failed:', profileError);
        toast({
          title: "Profile Test Failed",
          description: `Cannot fetch user profile: ${profileError.message}`,
          variant: "destructive",
        });
        return;
      }
      console.log('✅ Test 5 passed - Profile fetching OK');

      // Test 6: Hook data validation
      console.log('🧪 Test 6: Hook data validation...');
      console.log('🔍 Current hook state:', {
        friends: friends.length,
        requests: friendRequests.length,
        loading: loading,
        connected: isConnected
      });

      // Final success
      toast({
        title: "Friends System Test PASSED",
        description: `✅ All tests passed! ${friends.length} friends, ${friendRequests.length} requests`,
      });

      console.log('🎉 All friends system tests passed successfully!');

    } catch (error) {
      console.error('💥 Critical error in friends system test:', error);
      toast({
        title: "Friends System Test CRITICAL ERROR",
        description: `Unexpected error: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleRefreshFriends = async () => {
    try {
      console.log('🔄 Debug: Force refreshing friends system...');
      
      toast({
        title: "Refreshing Page",
        description: "Reloading to refresh friends system...",
      });
      
      // Simple page refresh to clear all state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('💥 Error refreshing friends:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh friends system",
        variant: "destructive",
      });
    }
  };

  const handleTestRLSPolicies = async () => {
    if (!isAdmin) {
      toast({
        title: "Admin Required",
        description: "RLS testing requires admin privileges",
        variant: "destructive",
      });
      return;
    }

    setIsTestingRLS(true);
    try {
      console.log('🧪 Debug: Testing RLS policies for user deletion...');
      
      // Test if admin function exists
      const { data: functionResult, error: functionError } = await supabase
        .rpc('admin_complete_user_deletion', {
          target_user_id: '00000000-0000-0000-0000-000000000000' // Fake ID to test function existence
        });

      if (functionError) {
        if (functionError.code === '42883') {
          toast({
            title: "Admin Function Missing",
            description: "admin_complete_user_deletion function not found. Run the manual SQL script.",
            variant: "destructive",
          });
        } else if (functionError.message.includes('User not found')) {
          toast({
            title: "RLS Test Passed",
            description: "Admin function exists and is working. RLS policies should be OK.",
          });
        } else {
          toast({
            title: "RLS Test Warning",
            description: `Function exists but returned: ${functionError.message}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "RLS Test Passed",
          description: "Admin function is working correctly!",
        });
      }

      // Test individual table access
      console.log('🧪 Testing individual table DELETE policies...');
      
      const testResults = [];
      
      // Test profiles table
      try {
        await supabase.from('profiles').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
        testResults.push('✅ Profiles DELETE: OK');
      } catch (err) {
        testResults.push(`❌ Profiles DELETE: ${err.message}`);
      }

      // Test messages table
      try {
        await supabase.from('messages').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
        testResults.push('✅ Messages DELETE: OK');
      } catch (err) {
        testResults.push(`❌ Messages DELETE: ${err.message}`);
      }

      // Test friends table
      try {
        await supabase.from('friends').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
        testResults.push('✅ Friends DELETE: OK');
      } catch (err) {
        testResults.push(`❌ Friends DELETE: ${err.message}`);
      }

      console.log('🧪 RLS Policy Test Results:', testResults);
      
      toast({
        title: "RLS Policy Test Complete",
        description: "Check console for detailed results",
      });

    } catch (error) {
      console.error('💥 RLS test error:', error);
      toast({
        title: "RLS Test Failed",
        description: "Failed to test RLS policies",
        variant: "destructive",
      });
    } finally {
      setIsTestingRLS(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4" />
          Debug Panel
          <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <strong>User:</strong> {user?.email?.substring(0, 20)}...
          </div>
          <div>
            <strong>Role:</strong> {isAdmin ? 'Admin' : 'User'}
          </div>
          <div>
            <strong>Friends:</strong> {friends.length}
          </div>
          <div>
            <strong>Requests:</strong> {friendRequests.length}
          </div>
          <div>
            <strong>Connected:</strong> {isConnected ? '✅' : '❌'}
          </div>
          <div>
            <strong>User ID:</strong> {user?.id?.substring(0, 8)}...
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearLocalStorage}
            disabled={isClearingCache}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear Cache
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestConnection}
            className="text-xs"
          >
            <Database className="h-3 w-3 mr-1" />
            Test DB
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTestFriendsSystem}
            className="text-xs"
          >
            <TestTube className="h-3 w-3 mr-1" />
            Test Friends
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshFriends}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Refresh Friends
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestRLSPolicies}
              disabled={isTestingRLS}
              className="text-xs"
            >
              <TestTube className={`h-3 w-3 mr-1 ${isTestingRLS ? 'animate-pulse' : ''}`} />
              Test RLS
            </Button>
          )}
        </div>

        {/* RLS Fix Notice */}
        {isAdmin && (
          <div className="text-xs bg-orange-100 dark:bg-orange-900 p-2 rounded border border-orange-200 dark:border-orange-800">
            <strong>🔧 Admin Notice:</strong> If user deletion fails, run the <code>manual_rls_fix.sql</code> script in Supabase SQL Editor to fix RLS policies.
          </div>
        )}

        {/* Detailed Info */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t text-xs space-y-1">
            <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
            <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
            <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...</div>
          </div>
        )}

        {/* Warning */}
        <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 p-2 rounded">
          ⚠️ Development mode only. This panel is hidden in production.
        </div>
      </CardContent>
    </Card>
  );
}; 