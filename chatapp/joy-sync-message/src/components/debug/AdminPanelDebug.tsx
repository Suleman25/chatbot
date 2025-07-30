import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const AdminPanelDebug = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const info: any = {};

    try {
      console.log('🔍 Starting admin panel debug...');

      // Test 1: Basic profiles query
      console.log('🔄 Test 1: Basic profiles query...');
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, created_at')
        .order('created_at', { ascending: false });

      info.profilesCount = profiles?.length || 0;
      info.profilesError = profilesError?.message || null;
      info.profilesData = profiles?.slice(0, 3) || [];

      console.log('✅ Profiles result:', info.profilesCount, 'users');
      console.log('📊 Sample profiles:', info.profilesData);

      // Test 2: Check if we can access auth.users
      console.log('🔄 Test 2: Auth users query...');
      try {
        const { data: authUsers, error: authError } = await supabase
          .from('auth.users')
          .select('id, email')
          .limit(5);

        info.authUsersCount = authUsers?.length || 0;
        info.authError = authError?.message || null;
        info.authData = authUsers?.slice(0, 3) || [];
      } catch (error) {
        info.authError = 'Cannot access auth.users directly';
        info.authUsersCount = 0;
      }

      // Test 3: Check RLS policies
      console.log('🔄 Test 3: Checking RLS...');
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'profiles');

      info.policiesCount = policies?.length || 0;
      info.policiesError = policiesError?.message || null;

      // Test 4: Try to get current user
      console.log('🔄 Test 4: Current user...');
      const { data: { user } } = await supabase.auth.getUser();
      info.currentUser = user?.email || 'Not logged in';
      info.currentUserId = user?.id || 'No ID';

      setDebugInfo(info);
    } catch (error) {
      console.error('❌ Debug error:', error);
      info.error = error.toString();
      setDebugInfo(info);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800">Admin Panel Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDebug} disabled={loading} variant="outline">
          {loading ? 'Running Debug...' : 'Run Debug Again'}
        </Button>

        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Profiles Count:</strong>
              <p className="text-muted-foreground">
                {debugInfo.profilesCount || 0} users
              </p>
              {debugInfo.profilesError && (
                <p className="text-red-500">Error: {debugInfo.profilesError}</p>
              )}
            </div>

            <div>
              <strong>Auth Users Count:</strong>
              <p className="text-muted-foreground">
                {debugInfo.authUsersCount || 0} users
              </p>
              {debugInfo.authError && (
                <p className="text-red-500">Error: {debugInfo.authError}</p>
              )}
            </div>

            <div>
              <strong>Current User:</strong>
              <p className="text-muted-foreground">
                {debugInfo.currentUser}
              </p>
            </div>

            <div>
              <strong>RLS Policies:</strong>
              <p className="text-muted-foreground">
                {debugInfo.policiesCount || 0} policies
              </p>
            </div>
          </div>

          {debugInfo.profilesData && debugInfo.profilesData.length > 0 && (
            <div>
              <strong>Sample Profiles:</strong>
              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(debugInfo.profilesData, null, 2)}
              </pre>
            </div>
          )}

          {debugInfo.error && (
            <div>
              <strong>Debug Error:</strong>
              <p className="text-red-500">{debugInfo.error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPanelDebug; 