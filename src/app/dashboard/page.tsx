'use client';

import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { LoanListItem, AdminLoanListItem } from '@/types/loan';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import { LoanCard } from '@/components/LoanCard';

interface DashboardStats {
  totalLoans: number;
  activeLoans: number;
  pendingLoans: number;
  totalPrincipal: number;
  totalOrganizations?: number;
  totalBorrowers?: number;
  activeOrganizations?: number;
}

export default function UserDashboard() {
  const [loans, setLoans] = useState<(LoanListItem | AdminLoanListItem)[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLoans: 0,
    activeLoans: 0,
    pendingLoans: 0,
    totalPrincipal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        if (isAdmin) {
          // Admin: Fetch platform-wide data
          const results = await Promise.allSettled([
            supabase.from('organizations').select('id, is_active').limit(1000),
            supabase.from('loans').select(`
              *,
              borrower:borrowers(
                first_name,
                last_name,
                email,
                kyc_status
              ),
              organization:organizations(
                name
              )
            `).order('created_at', { ascending: false }).limit(1000),
            supabase.from('borrowers').select('id').limit(1000),
          ]);

          const organizations = results[0].status === 'fulfilled' ? results[0].value.data : [];
          const allLoans = results[1].status === 'fulfilled' ? results[1].value.data : [];
          const borrowers = results[2].status === 'fulfilled' ? results[2].value.data : [];

          // Calculate platform-wide statistics
          const totalOrganizations = organizations?.length || 0;
          const activeOrganizations = organizations?.filter(org => org.is_active).length || 0;
          const totalLoans = allLoans?.length || 0;
          const totalBorrowers = borrowers?.length || 0;
          const pendingLoans = allLoans?.filter(loan => loan.status === 'application_completed').length || 0;
          const activeLoans = allLoans?.filter(loan => loan.status === 'active').length || 0;
          const totalPrincipal = allLoans?.reduce((sum, loan) => {
            const amount = parseFloat(loan.principal_amount || '0');
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0) || 0;

          setStats({
            totalLoans,
            activeLoans,
            pendingLoans,
            totalPrincipal,
            totalOrganizations,
            totalBorrowers,
            activeOrganizations,
          });
          setLoans(allLoans?.slice(0, 5) || []);
        } else {
          // Organization users: Fetch org-scoped data
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (profileError || !userProfile?.organization_id) {
            setError(profileError?.message || 'Could not retrieve organization ID for user.');
            setLoading(false);
            return;
          }

          const { data, error } = await supabase
            .from('loans')
            .select(`
              *,
              borrower:borrowers(
                first_name,
                last_name,
                email,
                kyc_status
              )
            `)
            .eq('organization_id', userProfile.organization_id)
            .order('created_at', { ascending: false });

          if (error) {
            setError(error.message);
            console.error('Error fetching loans:', error);
          } else {
            const loansData = data || [];
            setLoans(loansData);
            
            // Calculate org-scoped statistics
            setStats({
              totalLoans: loansData.length,
              activeLoans: loansData.filter(l => l.status === 'active').length,
              pendingLoans: loansData.filter(l => l.status === 'application_completed').length,
              totalPrincipal: loansData.reduce((sum, loan) => sum + parseFloat(loan.principal_amount), 0),
            });
          }
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchData();
    }
  }, [supabase, isAdmin, profile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
          <div className="p-8">
            {/* Dashboard Header */}
            <div className="mb-8">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
                  {isAdmin ? 'Admin Dashboard' : 'Welcome Back!'}
                </h1>
                <p className="text-gray-600 text-lg">
                  {isAdmin ? 'Platform overview and organization management' : 'Manage your organization\'s loan portfolio'}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              {isAdmin ? (
                <>
                  {/* Admin Stats */}
                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{stats.totalOrganizations}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Organizations</h3>
                    <p className="text-gray-500 text-sm mt-1">{stats.activeOrganizations} active</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{stats.totalLoans}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Loans</h3>
                    <p className="text-gray-500 text-sm mt-1">{stats.pendingLoans} pending</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{stats.totalBorrowers}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Borrowers</h3>
                    <p className="text-gray-500 text-sm mt-1">Platform-wide</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">${stats.totalPrincipal.toLocaleString()}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Portfolio</h3>
                    <p className="text-gray-500 text-sm mt-1">All organizations</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Organization Stats */}
                  <Link href="/dashboard/loans?filter=action_required" className="block">
                    <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20 cursor-pointer">
                      <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-gray-800">{stats.pendingLoans}</p>
                        </div>
                      </div>
                      <h3 className="text-gray-700 font-semibold text-lg">Pending Loans</h3>
                      <p className="text-gray-500 text-sm mt-1">Awaiting review</p>
                    </div>
                  </Link>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{stats.activeLoans}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Active Loans</h3>
                    <p className="text-gray-500 text-sm mt-1">Currently funded</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{stats.totalLoans}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Loans</h3>
                    <p className="text-gray-500 text-sm mt-1">All applications</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">${stats.totalPrincipal.toLocaleString()}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Portfolio</h3>
                    <p className="text-gray-500 text-sm mt-1">Principal amount</p>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 rounded-3xl p-8 mb-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-3">Ready to Create a New Loan?</h3>
                  <p className="text-blue-100 text-lg mb-4">Streamlined loan processing for your customers</p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Fast Processing
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Auto DocuSign
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard/loans/create"
                  className="bg-white text-green-600 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg flex items-center space-x-2"
                >
                  <span>Create Loan</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Recent Loans */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Loans</h2>
                    <p className="text-gray-600">Latest loan applications and their current status</p>
                  </div>
                  <Link
                    href="/dashboard/loans"
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <span>View All</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            
              {loading ? (
                <div className="p-12 text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600 font-medium">Loading your latest loans...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load loans</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : !loans || loans.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No loans yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first loan application for a customer.</p>
                  <Link
                    href="/dashboard/loans/create"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-bold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Your First Loan</span>
                  </Link>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {loans.slice(0, 5).map((loan) => (
                      <LoanCard 
                        key={loan.id} 
                        loan={loan} 
                        isAdmin={isAdmin}
                        showActions={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
  );
}