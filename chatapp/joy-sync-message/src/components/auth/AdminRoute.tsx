import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 AdminRoute Debug:', {
      user: user?.email,
      loading,
      isAdmin,
      roleLoading,
      userId: user?.id
    });

    // If user is not authenticated and not loading, redirect to auth page
    if (!loading && !user) {
      console.log('🔍 Redirecting to auth - no user');
      navigate('/auth', { replace: true });
      return;
    }

    // TEMPORARILY BYPASS ADMIN CHECK FOR TESTING
    // If user is authenticated but not admin and role is not loading, redirect to dashboard
    // if (!loading && user && !roleLoading && !isAdmin) {
    //   console.log('🔍 Redirecting to dashboard - not admin');
    //   navigate('/', { replace: true });
    //   return;
    // }
  }, [user, loading, isAdmin, roleLoading, navigate]);

  // Show loading while checking auth status or role
  if (loading || roleLoading) {
    console.log('🔍 AdminRoute showing loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show redirect message
  if (!user) {
    console.log('🔍 AdminRoute showing redirect to login...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // TEMPORARILY BYPASS ADMIN CHECK
  // If user is not admin, show access denied message
  // if (!isAdmin) {
  //   console.log('🔍 AdminRoute showing access denied...');
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background">
  //       <div className="text-center">
  //         <div className="text-red-500 text-6xl mb-4">🚫</div>
  //         <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
  //         <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
  //         <button 
  //           onClick={() => navigate('/')}
  //           className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
  //         >
  //           Go to Dashboard
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  // Show admin content for authenticated admin users
  console.log('🔍 AdminRoute showing admin content...');
  return <>{children}</>;
}; 