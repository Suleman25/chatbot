import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, User, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { fixAdminRole, checkAdminStatus } from '@/utils/adminRoleFix';
import { useToast } from '@/hooks/use-toast';

export const AdminFixPanel = () => {
  const [email, setEmail] = useState('sulemanjamil177@gmail.com');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const { toast } = useToast();

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const result = await checkAdminStatus(email);
      setStatus(result);
      
      if (result.exists) {
        toast({
          title: "User Status",
          description: `${email} - Role: ${result.role} ${result.isAdmin ? '(Admin)' : ''}`,
          variant: result.isAdmin ? "default" : "destructive",
        });
      } else {
        toast({
          title: "User Not Found",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check user status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFixAdminRole = async () => {
    setLoading(true);
    try {
      const result = await fixAdminRole(email);
      
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        
        // Re-check status
        const newStatus = await checkAdminStatus(email);
        setStatus(newStatus);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fix admin role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'moderator':
        return <Badge variant="secondary">Moderator</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Admin Role Fix
        </CardTitle>
        <CardDescription>
          Fix admin role assignment for users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email Address</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleCheckStatus} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            Check Status
          </Button>
          <Button 
            onClick={handleFixAdminRole} 
            disabled={loading}
            className="flex-1"
          >
            Make Admin
          </Button>
        </div>

        {status && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {status.exists ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">
                {status.exists ? 'User Found' : 'User Not Found'}
              </span>
            </div>

            {status.exists && (
              <>
                <div className="text-sm">
                  <strong>Email:</strong> {email}
                </div>
                <div className="text-sm">
                  <strong>Display Name:</strong> {status.display_name || 'Not set'}
                </div>
                <div className="text-sm">
                  <strong>User ID:</strong> {status.user_id}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Role:</strong>
                  {getRoleIcon(status.role)}
                  {getRoleBadge(status.role)}
                </div>
                {status.isAdmin && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Admin Access Granted</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 