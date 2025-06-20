import { createClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: string;
  interest_rate: string;
  term_months: number;
  monthly_payment: string;
  status: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
    kyc_status: string;
  };
  docusign_status: string;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch loans with borrower data
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      loan_number,
      principal_amount,
      interest_rate,
      term_months,
      monthly_payment,
      status,
      docusign_status,
      borrower:borrowers(
        first_name,
        last_name,
        email,
        kyc_status
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching loans:', error);
  }

  const getStatusColor = (status: string) => {
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

  // Calculate stats
  const totalLoans = loans?.length || 0;
  const activeLoans = loans?.filter(l => l.status === 'active').length || 0;
  const pendingLoans = loans?.filter(l => ['new', 'review'].includes(l.status)).length || 0;
  const totalPrincipal = loans?.reduce((sum, loan) => sum + parseFloat(loan.principal_amount), 0) || 0;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your loan portfolio</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-orange-800 font-medium">Current Loans Pending</h3>
              <div className="p-2 bg-orange-200 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-900">{pendingLoans}</p>
          </div>

          <div className="bg-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-green-800 font-medium">Total Active Loans</h3>
              <div className="p-2 bg-green-200 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-900">{activeLoans}</p>
          </div>

          <div className="bg-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blue-800 font-medium">Total Loans</h3>
              <div className="p-2 bg-blue-200 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900">{totalLoans}</p>
          </div>

          <div className="bg-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-purple-800 font-medium">Total Principal</h3>
              <div className="p-2 bg-purple-200 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-900">${totalPrincipal.toLocaleString()}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Create New Loan Today!</h3>
              <p className="text-yellow-100">Quick loan processing with automated workflows</p>
            </div>
            <Link
              href="/admin/loans/create"
              className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Create Loan →
            </Link>
          </div>
        </div>

        {/* Recent Loans */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Loans</h2>
              <Link
                href="/admin/loans"
                className="text-yellow-600 hover:text-yellow-700 font-medium text-sm"
              >
                View All →
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-1">Manage your loan applications effortlessly</p>
          </div>
          
          {error ? (
            <div className="p-6 text-red-600">
              Error loading loans: {error.message}
            </div>
          ) : !loans || loans.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No loans found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first loan</p>
              <Link
                href="/admin/loans/create"
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Create First Loan
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrower
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loans.slice(0, 5).map((loan: any) => {
                    const needsAdminApproval = loan.docusign_status === 'signed' && loan.status !== 'funded';
                    
                    return (
                      <tr key={loan.id} className={`hover:bg-gray-50 ${needsAdminApproval ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {needsAdminApproval && (
                              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                            )}
                            {loan.loan_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {loan.borrower?.first_name} {loan.borrower?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {loan.borrower?.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Personal Loan
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${parseFloat(loan.principal_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                              {loan.status}
                            </span>
                            {needsAdminApproval && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                🚨 Action Required
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className={`${needsAdminApproval ? 'text-orange-600 hover:text-orange-700' : 'text-yellow-600 hover:text-yellow-700'}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
