'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, FileText, Plus, Users, Bell, UserPlus, Building2, Menu, X, ShieldCheck } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import OnboardingModal from '@/components/dashboard/OnboardingModal';
import OnboardingBanner from '@/components/dashboard/OnboardingBanner';

interface UserLayoutProps {
  children: React.ReactNode;
}

// Color theme options with their gradient values
const COLOR_THEMES: Record<string, { gradient: string, bgGradient: string, shadow: string }> = {
  default: {
    gradient: 'from-green-500 to-teal-500',
    bgGradient: 'from-green-50 via-blue-50 to-teal-100',
    shadow: 'shadow-green-500/25'
  },
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 via-cyan-50 to-blue-100',
    shadow: 'shadow-blue-500/25'
  },
  purple: {
    gradient: 'from-purple-500 to-indigo-500',
    bgGradient: 'from-purple-50 via-indigo-50 to-purple-100',
    shadow: 'shadow-purple-500/25'
  },
  amber: {
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 via-yellow-50 to-orange-100',
    shadow: 'shadow-amber-500/25'
  },
  rose: {
    gradient: 'from-rose-500 to-pink-500',
    bgGradient: 'from-rose-50 via-pink-50 to-rose-100',
    shadow: 'shadow-rose-500/25'
  }
};

export default function UserLayout({ children }: UserLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  // Removed unused notification state variables
  // Organization settings for feature flags
  const [orgSettings, setOrgSettings] = useState<{
    enableLoans: boolean;
    enableStandaloneVerifications: boolean;
  }>({ enableLoans: true, enableStandaloneVerifications: false });
  const [logoUrl, setLogoUrl] = useState('/logoMain.png'); // Default logo
  const [colorTheme, setColorTheme] = useState('default'); // Default theme
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [organizationPhone, setOrganizationPhone] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  
  // Use the new role system
  const { profile, loading } = useUserProfile();

  // Get user on mount and fetch organization settings
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
  }, [router, supabase]);
  
  // Fetch organization settings
  useEffect(() => {
    const fetchOrgSettings = async () => {
      console.log('[UserLayout] Fetching org settings', {
        role: profile?.role,
        organizationId: profile?.organizationId
      });

      // Admin users get purple theme
      if (profile?.role === 'admin') {
        console.log('[UserLayout] Admin user detected, using purple theme');
        setColorTheme('purple');
        return;
      }
      
      if (!profile?.organizationId) {
        console.log('[UserLayout] No organization ID, skipping settings fetch');
        return;
      }
      
      try {
        // Fetch organization settings
        console.log('[UserLayout] Querying organization_settings for org:', profile.organizationId);
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', profile.organizationId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('[UserLayout] Error fetching organization settings:', error);
          // Continue with defaults on error
          return;
        }
        
        console.log('[UserLayout] Organization settings fetched:', data);

        if (data) {
          // Set feature flags
          setOrgSettings({
            enableLoans: data.enable_loans !== false, // Default to true if not set
            enableStandaloneVerifications: data.enable_standalone_verifications === true,
          });
          console.log('[UserLayout] Feature flags:', {
            enableLoans: data.enable_loans,
            enableStandaloneVerifications: data.enable_standalone_verifications,
          });

          // Set logo if available, otherwise keep default
          if (data.logo_url) {
            console.log('[UserLayout] Setting custom logo:', data.logo_url);
            setLogoUrl(data.logo_url);
          } else {
            console.log('[UserLayout] No custom logo, using default /logoMain.png');
          }

          // Set color theme if available, otherwise keep default
          if (data.color_theme && COLOR_THEMES[data.color_theme]) {
            console.log('[UserLayout] Setting color theme:', data.color_theme);
            setColorTheme(data.color_theme);
          } else {
            console.log('[UserLayout] No custom theme or invalid theme, using default');
          }
        } else {
          console.log('[UserLayout] No settings data found (PGRST116 - no rows)');
        }
      } catch (error) {
        console.error('[UserLayout] Exception fetching organization settings:', error);
        // Keep defaults on error - no additional action needed
      }
    };
    
    fetchOrgSettings();
  }, [profile?.organizationId, profile?.role, supabase]);

  // Check onboarding status for organization owners
  useEffect(() => {
    const checkOnboarding = async () => {
      if (profile?.role !== 'organization_owner' || !profile?.organizationId || !user?.id) return;

      console.log('[UserLayout] Checking onboarding status');

      // Check if coming from invite with onboarding flag
      const urlParams = new URLSearchParams(window.location.search);
      const showOnboarding = urlParams.get('onboarding') === 'true';

      // Fetch organization data to check if onboarding is complete
      const { data: org } = await supabase
        .from('organizations')
        .select('dealer_license_number, ein_number, phone, address, city, state, zip_code')
        .eq('id', profile.organizationId)
        .single();

      // Fetch profile data to check cell phone
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cell_phone')
        .eq('id', user.id)
        .single();

      const isComplete = !!(
        org?.dealer_license_number &&
        org?.ein_number &&
        org?.phone &&
        org?.address &&
        org?.city &&
        org?.state &&
        org?.zip_code &&
        profileData?.cell_phone
      );

      console.log('[UserLayout] Onboarding complete:', isComplete, {
        dealer_license_number: !!org?.dealer_license_number,
        ein_number: !!org?.ein_number,
        phone: !!org?.phone,
        address: !!org?.address,
        city: !!org?.city,
        state: !!org?.state,
        zip_code: !!org?.zip_code,
        cell_phone: !!profileData?.cell_phone
      });

      setOnboardingComplete(isComplete);
      setOrganizationPhone(org?.phone || '');

      if (!isComplete) {
        if (showOnboarding) {
          // Show modal immediately if coming from invite
          setShowOnboardingModal(true);
          // Remove query param from URL
          window.history.replaceState({}, '', pathname);
        } else {
          // Show banner if not complete and not from invite
          setShowOnboardingBanner(true);
        }
      } else {
        // Hide banner if onboarding is complete
        console.log('[UserLayout] Onboarding complete, hiding banner');
        setShowOnboardingBanner(false);
      }
    };

    checkOnboarding();

    // Listen for custom event to re-check onboarding
    const handleOnboardingUpdate = () => {
      console.log('[UserLayout] Onboarding update event received, re-checking');
      checkOnboarding();
    };

    window.addEventListener('onboardingUpdated', handleOnboardingUpdate);

    return () => {
      window.removeEventListener('onboardingUpdated', handleOnboardingUpdate);
    };
  }, [profile, user, supabase, pathname]);

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

  // Navigation items - filtered based on user role AND organization settings
  const getAllNavigation = () => {
    const isAdmin = profile?.role === 'admin';

    return [
      // Create Loan - only if loans enabled
      {
        name: 'Create Loan',
        href: '/dashboard/loans/create',
        icon: <Plus className="w-5 h-5" />,
        roles: ['user', 'organization_owner', 'team_member'],
        show: isAdmin || orgSettings.enableLoans, // Admin always sees, others need flag
      },
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        show: true,
      },
      // Loans - only if loans enabled
      {
        name: 'Loans',
        href: '/dashboard/loans',
        icon: <FileText className="w-5 h-5" />,
        show: isAdmin || orgSettings.enableLoans,
      },
      // Verifications - only if verifications enabled
      {
        name: 'Verifications',
        href: '/dashboard/verifications',
        icon: <ShieldCheck className="w-5 h-5" />,
        show: isAdmin || orgSettings.enableStandaloneVerifications,
      },
      // Borrowers - only if loans enabled (borrowers are loan-related)
      {
        name: 'Borrowers',
        href: '/dashboard/borrowers',
        icon: <Users className="w-5 h-5" />,
        show: isAdmin || orgSettings.enableLoans,
      },
      {
        name: 'Organizations',
        href: '/dashboard/organizations',
        icon: <Building2 className="w-5 h-5" />,
        roles: ['admin'],
        show: true,
      },
      {
        name: profile?.role === 'admin' ? 'Administrators' : 'Team',
        href: '/dashboard/team',
        icon: <UserPlus className="w-5 h-5" />,
        roles: ['admin', 'user', 'organization_owner'],
        show: true,
      },
    ];
  };

  const navigation = getAllNavigation().filter(item => {
    // Check role access
    const hasRoleAccess = !item.roles || !profile?.role || item.roles.includes(profile.role);
    // Check feature flag
    const hasFeatureAccess = item.show !== false;

    return hasRoleAccess && hasFeatureAccess;
  });

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

  // Get current theme colors
  const currentTheme = COLOR_THEMES[colorTheme] || COLOR_THEMES.default;
  
  return (
    <div className={`flex h-screen bg-gradient-to-br ${currentTheme.bgGradient}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/20 backdrop-blur-xl border-r border-white/30 flex flex-col transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo and Close Button */}
        <div className="flex items-center justify-between h-24 px-6 pt-6 border-b border-white/20">
          <Image 
            src={logoUrl} 
            alt="Organization Logo" 
            width={150} 
            height={150}
            className="rounded-xl shadow-lg object-contain"
            unoptimized
            onLoad={() => console.log('[UserLayout] Logo loaded successfully:', logoUrl)}
            onError={(e) => {
              console.error('[UserLayout] Logo failed to load:', logoUrl, e);
              setLogoUrl('/logoMain.png');
            }}
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center px-4 py-4 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                  isActive
                    ? `bg-gradient-to-r ${currentTheme.gradient} text-white shadow-lg ${currentTheme.shadow}`
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
        <header className="bg-white/20 backdrop-blur-xl border-b border-white/30 relative z-30">
          <div className="px-4 sm:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - Hamburger and Page title */}
              <div className="flex items-center space-x-4">
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                
                <h1 className="text-lg sm:text-xl font-semibold text-gray-700">
                  {pathname === '/dashboard' ? 'Dashboard' :
                   pathname === '/dashboard/loans' ? 'Loans' :
                   pathname === '/dashboard/verifications' ? 'Verifications' :
                   pathname === '/dashboard/borrowers' ? 'Borrowers' :
                   pathname === '/dashboard/organizations' ? 'Organizations' :
                   pathname === '/dashboard/team' ? (profile?.role === 'admin' ? 'Administrators' : 'Team Management') :
                   pathname.includes('/dashboard/loans/') ? 'Loan Details' :
                   pathname.includes('/dashboard/verifications/') ? 'Verification Details' :
                   pathname.includes('/dashboard/borrowers/') ? 'Borrower Details' :
                   'Dashboard'}
                </h1>
                
                {/* Search - Hidden on mobile */}
                <div className="relative hidden md:block">
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 w-64 lg:w-80 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
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
                    {/* Notification count will be implemented later */}
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
                        {(profile?.role === 'admin' || profile?.role === 'user' || profile?.role === 'organization_owner') && (
                          <Link href="/dashboard/settings/organization" className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50 rounded-xl transition-colors">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Organization Settings
                          </Link>
                        )}
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
          <div >
            {/* Onboarding Banner */}
            {showOnboardingBanner && !onboardingComplete && profile?.role === 'organization_owner' && (
              <OnboardingBanner
                onComplete={() => {
                  setShowOnboardingBanner(false);
                  setShowOnboardingModal(true);
                }}
                onDismiss={() => setShowOnboardingBanner(false)}
              />
            )}
            
            {children}
          </div>
        </main>

        {/* Onboarding Modal */}
        {showOnboardingModal && user?.id && profile?.organizationId && (
          <OnboardingModal
            onClose={() => setShowOnboardingModal(false)}
            onComplete={() => {
              setShowOnboardingModal(false);
              setOnboardingComplete(true);
              setShowOnboardingBanner(false);
            }}
            organizationId={profile.organizationId}
            userId={user.id}
            initialBusinessPhone={organizationPhone}
          />
        )}
      </div>
    </div>
  );
}