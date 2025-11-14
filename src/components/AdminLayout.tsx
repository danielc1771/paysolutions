'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, FileText, Plus, Users, Bell, Check, Clock, AlertCircle, UserPlus, Building2 } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import { getHomepageForRole, type Role } from '@/lib/auth/roles';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  
  // Use the new role system
  const { profile, loading } = useUserProfile();

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  // Handle role-based redirects
  useEffect(() => {
    if (!loading && profile) {
      // If user is not admin but accessing admin routes, redirect to their homepage
      if (profile.role !== 'admin' && pathname.startsWith('/admin')) {
        const homepage = getHomepageForRole(profile.role as Role);
        router.push(homepage);
      }
    }
  }, [profile, loading, pathname, router]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Record<string, unknown>) => !n.read).length);
      } else {
        console.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      
      // Listen for custom refresh events
      const handleRefreshNotifications = () => {
        fetchNotifications();
      };
      
      window.addEventListener('refreshNotifications', handleRefreshNotifications);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshNotifications', handleRefreshNotifications);
      };
    }
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}&action=mark_read`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications?action=mark_all_read', {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (iconType: string) => {
    switch (iconType) {
      case 'plus':
        return <Plus className="w-4 h-4" />;
      case 'check':
        return <Check className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: Date | string) => {
    const now = new Date();
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const navigation = [
    {
      name: 'Create Loan',
      href: '/admin/loans/create',
      icon: <Plus className="w-5 h-5" />,
    },
    {
      name: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Loans',
      href: '/admin/loans',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: 'Borrowers',
      href: '/admin/borrowers',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  const adminNavigation = [
    {
      name: 'Organizations',
      href: '/admin/organizations',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: <UserPlus className="w-5 h-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Sidebar */}
      <div className="w-72 bg-white/20 backdrop-blur-xl border-r border-white/30 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center h-24 border-b border-white/20">
          <Image 
            src="/logoMain.png" 
            alt="PaySolutions Logo" 
            width={150} 
            height={150}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-4 py-4 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-700 hover:bg-white/60 hover:backdrop-blur-sm hover:shadow-lg'
                }`}
              >
                <span className={`mr-4 p-2 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-white group-hover:shadow-md'
                }`}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </Link>
            );
          })}

          {profile?.role === 'admin' && (
            <>
              <div className="border-t border-white/20"></div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-4 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-gray-700 hover:bg-white/60 hover:backdrop-blur-sm hover:shadow-lg'
                    }`}
                  >
                    <span className={`mr-4 p-2 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-gray-100 group-hover:bg-white group-hover:shadow-md'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/20 backdrop-blur-xl border-b border-white/30 relative z-50">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Page title and search */}
              <div className="flex items-center space-x-6">
                <h1 className="text-xl font-semibold text-gray-700">
                  {pathname === '/admin' ? 'Dashboard' : 
                   pathname === '/admin/loans' ? 'Loans' :
                   pathname === '/admin/borrowers' ? 'Borrowers' :
                   pathname === '/admin/organizations' ? 'Organizations' :
                   pathname === '/admin/users' ? 'Users' :
                   pathname.includes('/admin/loans/') ? 'Loan Details' :
                   pathname.includes('/admin/borrowers/') ? 'Borrower Details' :
                   'Admin Panel'}
                </h1>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 w-80 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Right side - Notifications and user profile */}
              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-600 hover:text-gray-800 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 z-[9999]">
                      <div className="p-4 border-b border-gray-200/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id as string}
                              className={`p-4 border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                                !notification.read ? 'bg-blue-50/30' : ''
                              }`}
                              onClick={() => markNotificationAsRead(notification.id as number)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${
                                  notification.type === 'new_application' ? 'bg-blue-100 text-blue-600' :
                                  notification.type === 'document_signed' ? 'bg-green-100 text-green-600' :
                                  notification.type === 'kyc_pending' ? 'bg-orange-100 text-orange-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {getNotificationIcon(notification.icon as string)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">
                                      {String(notification.title)}
                                    </p>
                                    {!Boolean(notification.read) && (
                                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {String(notification.message)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatTimeAgo(notification.timestamp as string)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-3 text-center border-t border-gray-200/50">
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Account Dropdown */}
                <div className="relative z-50" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center space-x-3 p-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.user_metadata?.full_name || 'Admin User'}
                      </p>
                      <p className="text-xs text-gray-600">{user?.email || 'admin@paysolutions.com'}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showAccountDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showAccountDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 z-[9999]">
                      <div className="p-4 border-b border-gray-200/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-white">
                              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {user?.user_metadata?.full_name || 'Admin User'}
                            </p>
                            <p className="text-xs text-gray-600">{user?.email || 'admin@paysolutions.com'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link href="/dashboard/settings/organization" className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          Organization Settings
                        </Link>
                        <Link href="/profile" className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </Link>
                        <Link href="/account" className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Account Settings
                        </Link>
                        <hr className="my-2 border-gray-200/50" />
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50/50 rounded-xl transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
