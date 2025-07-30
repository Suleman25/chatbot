import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const AdminPanelTest = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAdminPanel = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing admin panel function...');
      
      const { data, error } = await supabase
        .rpc('get_all_users_for_admin_panel');

      if (error) {
        console.error('❌ Function error:', error);
        
        // Try direct query
        console.log('🔄 Trying direct query...');
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, created_at')
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error('❌ Profiles error:', profilesError);
          setUsers([]);
          return;
        }

        const userData = (profiles || []).map(profile => ({
          user_id: profile.user_id,
          display_name: profile.display_name || 'Unknown User',
          email: 'user@example.com',
          created_at: profile.created_at
        }));

        console.log('✅ Direct query result:', userData);
        setUsers(userData);
      } else {
        console.log('✅ Function result:', data);
        setUsers(data || []);
      }
    } catch (error) {
      console.error('❌ Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testAdminPanel();
  }, []);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">Admin Panel Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testAdminPanel} disabled={loading} variant="outline">
          {loading ? 'Testing...' : 'Test Admin Panel'}
        </Button>

        <div className="space-y-2">
          <h4 className="font-medium text-orange-800">Users Found: {users.length}</h4>
          
          {users.map((user, index) => (
            <div key={user.user_id} className="p-3 bg-white rounded border">
              <div className="flex items-center gap-2">
                <span className="font-medium">👤 {user.display_name}</span>
                <span className="text-sm text-gray-600">📧 {user.email}</span>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && !loading && (
          <p className="text-orange-700">No users found. Check console for errors.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPanelTest; 