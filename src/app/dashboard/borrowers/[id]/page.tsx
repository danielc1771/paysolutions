'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, DollarSign, Shield, Calendar, User, CreditCard } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { LoanListItem } from '@/types/loan';

interface BorrowerDetailProps {
  params: Promise<{ id: string }>;
}

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  ssn: string;
  annual_income: string;
  employment_status: string;
  employer_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  kyc_status: string;
  kyc_verified_at: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  loans?: Array<LoanListItem>;
}

export default function BorrowerDetail({ params }: BorrowerDetailProps) {
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchBorrowerData = async () => {
      try {
        const { id } = await params;
        
        // Get current user and their organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          setError('Organization not found');
          return;
        }

        // Fetch borrower with organization scoping and their loans
        const { data: borrowerData, error: borrowerError } = await supabase
          .from('borrowers')
          .select(`
            *,
            loans(
              id,
              loan_number,
              principal_amount,
              status,
              created_at,
              weekly_payment,
              interest_rate,
              term_weeks
            )
          `)
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .single();

        if (borrowerError) {
          if (borrowerError.code === 'PGRST116') {
            setError('Borrower not found or access denied');
          } else {
            setError('Failed to load borrower');
          }
          console.error('Error fetching borrower:', borrowerError);
          return;
        }

        setBorrower(borrowerData);
      } catch (err) {
        setError('Failed to load borrower');
        console.error('Error fetching borrower:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowerData();
  }, [params, supabase]);

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEmploymentStatusColor = (status: string) => {
    switch (status) {
      case 'employed': return 'bg-green-100 text-green-800';
      case 'self_employed': return 'bg-blue-100 text-blue-800';
      case 'unemployed': return 'bg-red-100 text-red-800';
      case 'retired': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLoanStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'signed': return 'bg-purple-100 text-purple-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
    );
  }

  if (error || !borrower) {
    return (
      <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600 mb-6">{error || 'Borrower not found'}</p>
              <Link
                href="/dashboard/borrowers"
                className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Borrowers
              </Link>
            </div>
          </div>
    );
  }

  // Calculate totals
  const totalLoans = borrower.loans?.length || 0;
  const totalPrincipal = borrower.loans?.reduce((sum, loan) => sum + parseFloat(loan.principal_amount), 0) || 0;
  const activeLoans = borrower.loans?.filter(loan => loan.status === 'active').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
          <div className="px-8 py-8 max-w-7xl mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <Link
                href="/dashboard/borrowers"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Borrowers
              </Link>
            </div>

            {/* Page Header */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                      {borrower.first_name} {borrower.last_name}
                    </h1>
                    <p className="text-gray-600 mt-2 text-lg flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {borrower.email}
                    </p>
                    <p className="text-gray-600 flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-2" />
                      {borrower.phone || 'No phone number'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex px-4 py-2 rounded-2xl border ${getKycStatusColor(borrower.kyc_status)}`}>
                    <Shield className="w-4 h-4 mr-2" />
                    <span className="font-semibold">KYC: {borrower.kyc_status?.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Member since {new Date(borrower.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50/70 backdrop-blur-sm rounded-3xl p-6 border border-blue-200/50 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 font-medium text-sm">Total Loans</p>
                    <p className="text-3xl font-bold text-blue-900">{totalLoans}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50/70 backdrop-blur-sm rounded-3xl p-6 border border-green-200/50 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 font-medium text-sm">Active Loans</p>
                    <p className="text-3xl font-bold text-green-900">{activeLoans}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50/70 backdrop-blur-sm rounded-3xl p-6 border border-purple-200/50 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 font-medium text-sm">Total Principal</p>
                    <p className="text-3xl font-bold text-purple-900">${totalPrincipal.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Personal Information */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Personal Information
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Full Name:
                    </span>
                    <span className="font-semibold text-gray-900">{borrower.first_name} {borrower.last_name}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email:
                    </span>
                    <span className="font-semibold text-gray-900">{borrower.email}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Phone:
                    </span>
                    <span className="font-semibold text-gray-900">{borrower.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Date of Birth:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {borrower.date_of_birth ? new Date(borrower.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">SSN:</span>
                    <span className="font-semibold text-gray-900">
                      {borrower.ssn ? `***-**-${borrower.ssn.slice(-4)}` : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-gray-600 font-medium flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address:
                    </span>
                    <span className="font-semibold text-gray-900 text-right">
                      {borrower.address_line1}<br />
                      {borrower.address_line2 && <>{borrower.address_line2}<br /></>}
                      {borrower.city}, {borrower.state} {borrower.zip_code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employment & Financial Information */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-green-600" />
                  Employment & Financial
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Employment Status:</span>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getEmploymentStatusColor(borrower.employment_status)}`}>
                      {borrower.employment_status?.replace('_', ' ') || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Employer:</span>
                    <span className="font-semibold text-gray-900">{borrower.employer_name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Annual Income:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {borrower.annual_income ? `$${parseFloat(borrower.annual_income).toLocaleString()}` : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      KYC Status:
                    </span>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getKycStatusColor(borrower.kyc_status)}`}>
                      {borrower.kyc_status?.replace('_', ' ')}
                    </span>
                  </div>
                  {borrower.kyc_verified_at && (
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">KYC Verified:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(borrower.kyc_verified_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-3">
                    <span className="text-gray-600 font-medium">Last Updated:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(borrower.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loans Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Loan History ({totalLoans})
                </h2>
                <p className="text-sm text-gray-500 mt-1">All loans associated with this borrower</p>
              </div>
              
              {!borrower.loans || borrower.loans.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No loans found</h3>
                  <p className="text-gray-500">This borrower has not applied for any loans yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loan Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weekly Payment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Applied
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/50 divide-y divide-gray-200">
                      {borrower.loans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-50/70 cursor-pointer">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {loan.loan_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${parseFloat(loan.principal_amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${parseFloat(loan.weekly_payment).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {loan.term_weeks} weeks
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(parseFloat(loan.interest_rate) * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLoanStatusColor(loan.status)}`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(loan.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/dashboard/loans/${loan.id}`}
                              className="text-blue-600 hover:text-blue-700 p-2 rounded-xl hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
  );
}