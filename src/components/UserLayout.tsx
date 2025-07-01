'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, FileText, Plus, Users, Bell, Check, Clock, AlertCircle, UserPlus } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
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

  const navigation = [
    {
      name: 'Create Loan',
      href: '/dashboard/loans/create',
      icon: <Plus className="w-5 h-5" />,
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Loans',
      href: '/dashboard/loans',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: 'Borrowers',
      href: '/dashboard/borrowers',
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: 'Team',
      href: '/dashboard/team',
      icon: <UserPlus className="w-5 h-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
      {/* Sidebar */}
      <div className="w-72 bg-white/20 backdrop-blur-xl border-r border-white/30 flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center h-24 border-b border-white/20">
          <Image 
            src="/logoMain.png" 
            alt="PaySolutions Logo" 
            width={200} 
            height={200}
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
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-500/25'
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
                  {pathname === '/dashboard' ? 'Dashboard' : 
                   pathname === '/dashboard/loans' ? 'Loans' :
                   pathname === '/dashboard/borrowers' ? 'Borrowers' :
                   pathname === '/dashboard/team' ? 'Team Management' :
                   pathname.includes('/dashboard/loans/') ? 'Loan Details' :
                   pathname.includes('/dashboard/borrowers/') ? 'Borrower Details' :
                   'Dashboard'}
                </h1>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 w-80 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Right side - Organization info and user profile */}
              <div className="flex items-center space-x-4">
                {/* Organization Info */}
                {profile && (
                  <div className="hidden lg:block bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm">
                    <p className="text-xs text-gray-500">Organization</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.organizationId === 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f' ? 'easycar' : 
                       profile.organizationId === 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f' ? 'Test Dealership 2' : 
                       'Your Organization'}
                    </p>
                  </div>
                )}

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
                </div>

                {/* User Account Dropdown */}
                <div className="relative z-50" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center space-x-3 p-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile?.fullName || 'User'}
                      </p>
                      <p className="text-xs text-gray-600">{profile?.email || user?.email}</p>
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
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-white">
                              {profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {profile?.fullName || 'User'}
                            </p>
                            <p className="text-xs text-gray-600">{profile?.email || user?.email}</p>
                            <p className="text-xs text-green-600 font-medium capitalize">{profile?.role} Account</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </button>
                        <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Organization Settings
                        </button>
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