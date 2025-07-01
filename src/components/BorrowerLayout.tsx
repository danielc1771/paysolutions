'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { CreditCard, FileText, User, Bell, Clock, AlertCircle } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';

interface BorrowerLayoutProps {
  children: React.ReactNode;
}

export default function BorrowerLayout({ children }: BorrowerLayoutProps) {
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
      name: 'Dashboard',
      href: '/borrower/dashboard',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: 'My Loan',
      href: '/borrower/loan',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: 'Payments',
      href: '/borrower/payments',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      name: 'Documents',
      href: '/borrower/documents',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: 'Profile',
      href: '/borrower/profile',
      icon: <User className="w-5 h-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
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
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
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

        {/* Help Section */}
        <div className="p-6 border-t border-white/20">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-xs text-gray-600 mb-3">Contact our support team for any questions about your loan.</p>
            <button className="w-full bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-xl hover:bg-blue-600 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/20 backdrop-blur-xl border-b border-white/30 relative z-50">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Page title */}
              <div className="flex items-center space-x-6">
                <h1 className="text-xl font-semibold text-gray-700">
                  {pathname === '/borrower/dashboard' ? 'Dashboard' : 
                   pathname === '/borrower/loan' ? 'My Loan' :
                   pathname === '/borrower/payments' ? 'Payments' :
                   pathname === '/borrower/documents' ? 'Documents' :
                   pathname === '/borrower/profile' ? 'Profile' :
                   'My Account'}
                </h1>
              </div>

              {/* Right side - Notifications and user profile */}
              <div className="flex items-center space-x-4">
                {/* Loan Status */}
                {profile && (
                  <div className="hidden lg:block bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm">
                    <p className="text-xs text-gray-500">Account Status</p>
                    <p className="text-sm font-semibold text-blue-700">Borrower Account</p>
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
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        {profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'B'}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile?.fullName || 'Borrower'}
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
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-white">
                              {profile?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'B'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {profile?.fullName || 'Borrower'}
                            </p>
                            <p className="text-xs text-gray-600">{profile?.email || user?.email}</p>
                            <p className="text-xs text-blue-600 font-medium">Borrower Account</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link href="/borrower/profile" className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile Settings
                        </Link>
                        <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Help & Support
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