import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, 
  User, 
  Settings, 
  MessageCircle, 
  Users, 
  Home,
  Crown,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  setMobileMenuOpenApp: (isOpen: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileMenuOpenApp }) => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin, isModerator } = useUserRole();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Synchronize internal mobile menu state with App's global state
  useEffect(() => {
    setMobileMenuOpenApp(mobileMenuOpen);
  }, [mobileMenuOpen, setMobileMenuOpenApp]);

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Fetch pending friend requests count
  const fetchPendingRequestsCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friends')
        .select('id')
        .eq('status', 'pending')
        .eq('friend_id', user.id);

      if (error) {
        console.error('Error fetching pending requests count:', error);
        return;
      }

      setPendingRequestsCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
    }
  };

  useEffect(() => {
    fetchPendingRequestsCount();
    
    // Set up real-time subscription for friend requests
    const channel = supabase
      .channel('friend_requests_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends'
        },
        () => {
          fetchPendingRequestsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/messages', label: 'Messages', icon: MessageCircle },
    { 
      path: '/friends', 
      label: 'Friends', 
      icon: Users,
      notificationCount: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
    },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: Crown }] : [])
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="hidden sm:block font-semibold text-lg">ChatApp</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 relative ${
                    isActiveRoute(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.path === '/friends' ? 'Friends' : item.label}</span>
                  {item.notificationCount && item.notificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                    >
                      {item.notificationCount > 99 ? '99+' : item.notificationCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Menu - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {isAdmin && (
              <Badge variant="secondary" className="flex items-center space-x-1 badge-responsive">
                <Crown className="h-3 w-3" />
                <span className="hidden sm:inline">Admin</span>
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                    <AvatarFallback className="flex items-center justify-center">
                      {isAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
                      {!isAdmin && user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 sm:w-56 md:w-64 p-2 dropdown-responsive" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-semibold leading-none">
                      {profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-sm leading-none text-muted-foreground mt-1">
                      {user.email}
                    </p>
                    {/* Administrator badge removed from desktop dropdown menu as per request */}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile-settings" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {isAdmin && (
              <Badge variant="secondary" className="flex items-center space-x-1 badge-responsive">
                <Crown className="h-3 w-3" />
                <span className="hidden xs:inline">Admin</span>
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="z-[1001] touch-manipulation" // Removed p-0 and pointer-events-auto
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm md:hidden w-screen h-screen"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Menu Content (Right Side Slide-in) */}
      <div
        className={`fixed inset-y-0 right-0 w-full h-screen z-[999] transform transition-transform duration-300 ease-in-out bg-background shadow-lg md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="font-semibold text-lg">ChatApp</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 w-10 h-10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {/* User Profile and Settings in Mobile Menu */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center space-x-3 px-4 py-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                <AvatarFallback className="flex items-center justify-center">
                  {isAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
                  {!isAdmin && user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
                {/* Administrator badge removed from mobile menu profile section as per request */}
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4 space-y-1">
              <Link
                to="/profile-settings"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <User className="h-5 w-5" />
                <span>Profile Settings</span>
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  closeMobileMenu();
                }}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors text-red-600 hover:text-red-700 hover:bg-accent"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}; 