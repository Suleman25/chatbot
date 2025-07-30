import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const AdminTestPanel = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserRole();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Check if user is authenticated
      results.userAuthenticated = !!user;
      results.userEmail = user?.email || 'Not logged in';

      // Test 2: Check admin status
      results.isAdmin = isAdmin;
      results.isLoading = isLoading;

      // Test 3: Check if profiles table has data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, is_admin')
        .limit(5);

      results.profilesCount = profiles?.length || 0;
      results.profilesError = profilesError?.message || null;

      // Test 4: Check if user_roles table has data
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .limit(5);

      results.rolesCount = roles?.length || 0;
      results.rolesError = rolesError?.message || null;

      // Test 5: Check current user's profile
      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('user_id, display_name, is_admin')
          .eq('user_id', user.id)
          .single();

        results.userProfile = userProfile;
        results.userProfileError = userProfileError?.message || null;

        // Test 6: Check current user's role
        const { data: userRole, error: userRoleError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('user_id', user.id)
          .single();

        results.userRole = userRole;
        results.userRoleError = userRoleError?.message || null;
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
      results.testError = error;
      setTestResults(results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, [user, isAdmin]);

  return (
    <div className="p-6 bg-background">
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Tests Again'}
          </Button>

          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>User Authentication:</strong>
                <p className="text-muted-foreground">
                  {testResults.userAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
                </p>
                <p className="text-muted-foreground">
                  Email: {testResults.userEmail}
                </p>
              </div>

              <div>
                <strong>Admin Status:</strong>
                <p className="text-muted-foreground">
                  {testResults.isAdmin ? '✅ Admin' : '❌ Not Admin'}
                </p>
                <p className="text-muted-foreground">
                  Loading: {testResults.isLoading ? 'Yes' : 'No'}
                </p>
              </div>

              <div>
                <strong>Profiles Table:</strong>
                <p className="text-muted-foreground">
                  Count: {testResults.profilesCount}
                </p>
                {testResults.profilesError && (
                  <p className="text-red-500">Error: {testResults.profilesError}</p>
                )}
              </div>

              <div>
                <strong>User Roles Table:</strong>
                <p className="text-muted-foreground">
                  Count: {testResults.rolesCount}
                </p>
                {testResults.rolesError && (
                  <p className="text-red-500">Error: {testResults.rolesError}</p>
                )}
              </div>
            </div>

            {testResults.userProfile && (
              <div>
                <strong>Current User Profile:</strong>
                <pre className="text-xs bg-muted p-2 rounded mt-1">
                  {JSON.stringify(testResults.userProfile, null, 2)}
                </pre>
              </div>
            )}

            {testResults.userRole && (
              <div>
                <strong>Current User Role:</strong>
                <pre className="text-xs bg-muted p-2 rounded mt-1">
                  {JSON.stringify(testResults.userRole, null, 2)}
                </pre>
              </div>
            )}

            {testResults.testError && (
              <div>
                <strong>Test Error:</strong>
                <p className="text-red-500">{testResults.testError.toString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTestPanel; 