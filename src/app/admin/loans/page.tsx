'use client';

import { createClient } from '@/utils/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: string;
  interest_rate: string;
  term_months: number;
  monthly_payment: string;
  remaining_balance: string;
  status: string;
  purpose: string;
  created_at: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
    kyc_status: string;
  } | null;
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    loanId: string;
    loanNumber: string;
  }>({
    isOpen: false,
    loanId: '',
    loanNumber: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loans')
        .select(`
          id,
          loan_number,
          principal_amount,
          interest_rate,
          term_months,
          monthly_payment,
          remaining_balance,
          status,
          purpose,
          created_at,
          borrower:borrowers(
            first_name,
            last_name,
            email,
            kyc_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        // Transform the data to match our interface
        const transformedData = data?.map((loan: any) => ({
          ...loan,
          borrower: Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower
        })) || [];
        setLoans(transformedData);
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId);

      if (error) {
        alert('Error deleting loan: ' + error.message);
      } else {
        alert('Loan deleted successfully');
        // Refresh the loans list
        fetchLoans();
      }
    } catch (err) {
      alert('Failed to delete loan');
    } finally {
      setDeleteConfirm({ isOpen: false, loanId: '', loanNumber: '' });
    }
  };

  const openDeleteConfirm = (loanId: string, loanNumber: string) => {
    setDeleteConfirm({
      isOpen: true,
      loanId,
      loanNumber
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, loanId: '', loanNumber: '' });
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">All Loans</h1>
            <p className="text-gray-600">Manage and track all loan applications</p>
          </div>
          <Link
            href="/admin/loans/create"
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Loan
          </Link>
        </div>

        {/* Loans Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading loans...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-red-600">
              Error loading loans: {error}
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
                      Loan Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrower
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Terms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loans.map((loan: Loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {loan.loan_number}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {loan.purpose} Loan
                          </div>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ${parseFloat(loan.principal_amount).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Balance: ${parseFloat(loan.remaining_balance).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {(parseFloat(loan.interest_rate) * 100).toFixed(2)}% APR
                          </div>
                          <div className="text-sm text-gray-500">
                            {loan.term_months} months
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(loan.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            className="text-red-600 hover:text-red-700"
                            title="Delete Loan"
                            onClick={() => openDeleteConfirm(loan.id, loan.loan_number)}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-sm p-6 w-96">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Delete Loan Confirmation</h2>
            <p className="text-gray-600 mb-4">Are you sure you want to delete loan {deleteConfirm.loanNumber}?</p>
            <div className="flex space-x-2">
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => handleDeleteLoan(deleteConfirm.loanId)}
              >
                Delete
              </button>
              <button
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded"
                onClick={closeDeleteConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
