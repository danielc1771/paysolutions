'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import DataTable, { Column } from '@/components/ui/DataTable'; // Assuming this exists and works
import {
    BarChart3,
    DollarSign,
    AlertTriangle,
    Calendar,
    FileText,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

interface ReportStats {
    totalFunded: number;
    totalCollected: number;
    totalLoans: number;
    activeLoans: number;
    defaultedLoans: number;
    closedLoans: number;
}

interface LoanData {
    id: string;
    loan_number: string;
    borrower: {
        first_name: string;
        last_name: string;
    };
    organization: {
        name: string;
    };
    principal_amount: string;
    remaining_balance: string;
    status: string;
    days_overdue: number;
    created_at: string;
    funding_date: string | null;
}

interface PaymentData {
    id: string;
    amount: string;
    payment_date: string;
    loan_id: string;
    status: string;
}

interface OrganizationData {
    id: string;
    name: string;
    created_at: string;
}

export default function ReportsView() {
    const [activeTab, setActiveTab] = useState<'funding' | 'collections' | 'status'>('funding');
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState<LoanData[]>([]);
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [organization, setOrganization] = useState<OrganizationData | null>(null);
    const [allOrganizations, setAllOrganizations] = useState<OrganizationData[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
    const { profile } = useUserProfile();
    const isAdmin = profile?.role === 'admin';
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchData = async () => {
            if (!profile) return;
            setLoading(true);
            try {
                // Fetch Organization Details (for Longevity)
                let orgData: OrganizationData | null = null;
                if (!isAdmin && profile.organizationId) {
                    const { data } = await supabase
                        .from('organizations')
                        .select('id, name, created_at')
                        .eq('id', profile.organizationId)
                        .single();
                    orgData = data;
                    setOrganization(data);
                } else if (isAdmin) {
                    const { data } = await supabase
                        .from('organizations')
                        .select('id, name, created_at');
                    setAllOrganizations(data || []);
                }

                // Prepare query filters
                let loanQuery = supabase
                    .from('loans')
                    .select(`
            id, 
            loan_number, 
            principal_amount, 
            remaining_balance, 
            status, 
            days_overdue, 
            created_at, 
            funding_date,
            borrower:borrowers(first_name, last_name),
            organization:organizations(name)
          `)
                    .order('created_at', { ascending: false });

                if (!isAdmin && profile.organizationId) {
                    loanQuery = loanQuery.eq('organization_id', profile.organizationId);
                } else if (isAdmin && selectedOrgId !== 'all') {
                    loanQuery = loanQuery.eq('organization_id', selectedOrgId);
                }

                const { data: rawLoanData, error: loanError } = await loanQuery;

                if (loanError) throw loanError;

                // Transform raw data to match LoanData interface
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formattedLoans: LoanData[] = (rawLoanData || []).map((loan: any) => ({
                    id: loan.id,
                    loan_number: loan.loan_number,
                    principal_amount: loan.principal_amount,
                    remaining_balance: loan.remaining_balance,
                    status: loan.status,
                    days_overdue: loan.days_overdue,
                    created_at: loan.created_at,
                    funding_date: loan.funding_date,
                    borrower: Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower,
                    organization: Array.isArray(loan.organization) ? loan.organization[0] : loan.organization
                })).filter(loan => loan.borrower); // Ensure borrower exists

                setLoans(formattedLoans);

                // Fetch Payments
                // Ideally filter by organization or loan IDs, but for simplicity fetching recent payments
                // For optimization, we should grab loan IDs and use 'in' filter
                if (formattedLoans && formattedLoans.length > 0) {
                    const loanIds = formattedLoans.map(l => l.id);
                    const { data: paymentData, error: paymentError } = await supabase
                        .from('payments')
                        .select('id, amount, payment_date, loan_id, status')
                        .in('loan_id', loanIds)
                        .eq('status', 'completed'); // Only completed payments count as collected

                    if (paymentError) throw paymentError;
                    setPayments(paymentData || []);
                } else {
                    setPayments([]);
                }

            } catch (error) {
                console.error('Error fetching report data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile, isAdmin, selectedOrgId, supabase]);

    // Calculate Stats
    const stats: ReportStats = useMemo(() => {
        const totalFunded = loans.reduce((sum, loan) => {
            // Only count funded/active/closed loans for "Funded" amount? 
            // Or all loans? "Funding Report" usually implies money out.
            if (['funded', 'active', 'closed', 'settled', 'defaulted'].includes(loan.status)) {
                return sum + (parseFloat(loan.principal_amount) || 0);
            }
            return sum;
        }, 0);

        const totalCollected = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

        return {
            totalFunded,
            totalCollected,
            totalLoans: loans.length,
            activeLoans: loans.filter(l => l.status === 'active').filter(l => (l.days_overdue || 0) <= 0).length, // Strictly active/good standing
            defaultedLoans: loans.filter(l => l.status === 'defaulted').length,
            closedLoans: loans.filter(l => l.status === 'closed' || l.status === 'settled').length
        };
    }, [loans, payments]);

    // Dealer Longevity
    const longevity = useMemo(() => {
        const targetOrg = isAdmin && selectedOrgId !== 'all'
            ? allOrganizations.find(o => o.id === selectedOrgId)
            : organization;

        if (!targetOrg?.created_at) return null;

        const start = new Date(targetOrg.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);

        return `${years} Years, ${months} Months`;
    }, [organization, allOrganizations, selectedOrgId, isAdmin]);

    // Columns for Account Status
    const statusColumns: Column<LoanData>[] = [
        {
            key: 'loan_info',
            label: 'Loan Info',
            render: (loan) => (
                <div>
                    <div className="font-semibold text-gray-900">{loan.loan_number}</div>
                    <div className="text-xs text-gray-500">{new Date(loan.created_at).toLocaleDateString()}</div>
                </div>
            )
        },
        {
            key: 'borrower',
            label: 'Borrower',
            render: (loan) => (
                <div className="text-sm text-gray-900">
                    {loan.borrower?.first_name} {loan.borrower?.last_name}
                </div>
            )
        },
        {
            key: 'organization',
            label: 'Organization',
            render: (loan) => (
                <div className="text-sm text-gray-600">{loan.organization?.name || 'N/A'}</div>
            ),
            show: () => isAdmin && selectedOrgId === 'all'
        },
        {
            key: 'status',
            label: 'Status',
            render: (loan) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize
                ${loan.status === 'active' ? 'bg-green-100 text-green-800' :
                        loan.status === 'defaulted' ? 'bg-red-100 text-red-800' :
                            loan.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'}
            `}>
                    {loan.status.replace('_', ' ')}
                </span>
            )
        },
        {
            key: 'risk',
            label: 'Risk Level',
            render: (loan) => {
                const days = loan.days_overdue || 0;
                // Hard-coded thresholds
                let color = 'bg-gray-100 text-gray-600';
                let label = 'N/A';

                if (['active', 'active_late'].includes(loan.status) || days > 0) {
                    if (days === 0) {
                        color = 'bg-green-100 text-green-800';
                        label = 'Low Risk'; // Green
                    } else if (days <= 15) {
                        color = 'bg-yellow-100 text-yellow-800';
                        label = 'Medium Risk'; // Yellow
                    } else {
                        color = 'bg-red-100 text-red-800';
                        label = 'High Risk'; // Red
                    }
                }

                return (
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                            {label}
                        </span>
                        {days > 0 && <span className="text-xs text-red-500">({days} days)</span>}
                    </div>
                )
            }
        },
        {
            key: 'balance',
            label: 'Outstanding Balance',
            render: (loan) => (
                <div className="text-right font-medium text-gray-900">
                    ${parseFloat(loan.remaining_balance || '0').toLocaleString()}
                </div>
            )
        }
    ];

    // Columns for Funding View (List of Loans funded?) 
    // User asked for "Funding & Collection Report". Maybe separate tables or updated logic.
    // I will show a list of funded loans here.
    const fundingColumns: Column<LoanData>[] = [
        {
            key: 'funding_date',
            label: 'Funded Date',
            render: (loan) => (
                <div className="text-sm text-gray-900">
                    {loan.funding_date ? new Date(loan.funding_date).toLocaleDateString() : '-'}
                </div>
            )
        },
        {
            key: 'loan_number',
            label: 'Loan #',
            render: (loan) => <span className="font-medium text-gray-900">{loan.loan_number}</span>
        },
        {
            key: 'borrower',
            label: 'Borrower',
            render: (loan) => <span className="text-gray-900">{loan.borrower?.first_name} {loan.borrower?.last_name}</span>
        },
        {
            key: 'organization',
            label: 'Organization',
            render: (loan) => <span className="text-sm text-gray-600">{loan.organization?.name || 'N/A'}</span>,
            show: () => isAdmin && selectedOrgId === 'all'
        },
        {
            key: 'amount',
            label: 'Funded Amount',
            render: (loan) => <span className="font-bold text-gray-900">${parseFloat(loan.principal_amount).toLocaleString()}</span>
        }
    ];

    // Collection Report Columns (Payments)
    const collectionColumns: Column<PaymentData>[] = [
        {
            key: 'date',
            label: 'Payment Date',
            render: (payment) => <span className="text-sm text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</span>
        },
        {
            key: 'organization', // Need to join organization name to payment data or fetch it
            label: 'Organization',
            render: (payment) => {
                // We need to look up the organization from the loans array since payments don't have it directly in this interface
                // This is a bit inefficient but works for now given the data structure
                const loan = loans.find(l => l.id === payment.loan_id);
                return <span className="text-sm text-gray-600">{loan?.organization?.name || 'N/A'}</span>
            },
            show: () => isAdmin && selectedOrgId === 'all'
        },
        {
            key: 'amount',
            label: 'Amount Collected',
            render: (payment) => <span className="font-bold text-green-600">+${parseFloat(payment.amount).toLocaleString()}</span>
        },
        {
            key: 'status',
            label: 'Status',
            render: (payment) => <span className="capitalize text-xs text-gray-500">{payment.status}</span>
        }
    ];



    // Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState('all');
    const [riskFilter, setRiskFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' }); // Default sort

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Helper to handle "Sort By" dropdown
    const handleSortChange = (value: string) => {
        const [key, direction] = value.split('-');
        setSortConfig({ key, direction: direction as 'asc' | 'desc' });
    };

    // Derived Data
    const getFilteredAndSortedLoans = () => {
        let filtered = [...loans];

        // 1. Tab-specific base filtering
        if (activeTab === 'funding') {
            filtered = filtered.filter(l => l.funding_date);
            // Date Range Filter
            if (dateRange.start) {
                filtered = filtered.filter(l => l.funding_date && l.funding_date >= dateRange.start);
            }
            if (dateRange.end) {
                filtered = filtered.filter(l => l.funding_date && l.funding_date <= dateRange.end);
            }
        } else if (activeTab === 'status') {
            // Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(l =>
                    l.loan_number.toLowerCase().includes(query) ||
                    l.borrower?.first_name.toLowerCase().includes(query) ||
                    l.borrower?.last_name.toLowerCase().includes(query) ||
                    l.organization?.name.toLowerCase().includes(query)
                );
            }
            // Status Filter
            if (statusFilter !== 'all') {
                filtered = filtered.filter(l => l.status === statusFilter);
            }
            // Risk Filter
            if (riskFilter !== 'all') {
                filtered = filtered.filter(l => {
                    const days = l.days_overdue || 0;
                    if (['active', 'active_late'].includes(l.status) || days > 0) {
                        if (riskFilter === 'green') return days === 0;
                        if (riskFilter === 'yellow') return days >= 1 && days <= 15;
                        if (riskFilter === 'high') return days >= 16;
                    }
                    return false;
                });
            }
        }

        // 2. Sorting
        if (sortConfig) {
            filtered.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof LoanData];
                let bValue: any = b[sortConfig.key as keyof LoanData];

                const key = sortConfig.key;

                // Map sort keys from dropdown/columns to actual data fields
                if (key === 'borrower') {
                    aValue = `${a.borrower?.last_name} ${a.borrower?.first_name}`;
                    bValue = `${b.borrower?.last_name} ${b.borrower?.first_name}`;
                } else if (key === 'organization' || key === 'org') {
                    aValue = a.organization?.name || '';
                    bValue = b.organization?.name || '';
                } else if (key === 'risk') {
                    aValue = a.days_overdue || 0;
                    bValue = b.days_overdue || 0;
                } else if (key === 'amount' || key === 'balance') {
                    aValue = parseFloat(key === 'amount' ? a.principal_amount : a.remaining_balance);
                    bValue = parseFloat(key === 'amount' ? b.principal_amount : b.remaining_balance);
                } else if (key === 'date' || key === 'funding_date') {
                    // Start/Funded Date
                    aValue = activeTab === 'status' ? a.created_at : (a.funding_date || '');
                    bValue = activeTab === 'status' ? b.created_at : (b.funding_date || '');
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    };

    const getFilteredAndSortedPayments = () => {
        let filtered = [...payments];

        if (dateRange.start) {
            filtered = filtered.filter(p => p.payment_date >= dateRange.start);
        }
        if (dateRange.end) {
            filtered = filtered.filter(p => p.payment_date <= dateRange.end);
        }

        if (sortConfig) {
            filtered.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof PaymentData];
                let bValue: any = b[sortConfig.key as keyof PaymentData];

                const key = sortConfig.key;

                if (key === 'amount') {
                    aValue = parseFloat(a.amount);
                    bValue = parseFloat(b.amount);
                } else if (key === 'date') {
                    aValue = a.payment_date;
                    bValue = b.payment_date;
                } else if (key === 'organization') {
                    // Sort payments by organization name (requires lookup)
                    const loanA = loans.find(l => l.id === a.loan_id);
                    const loanB = loans.find(l => l.id === b.loan_id);
                    aValue = loanA?.organization?.name || '';
                    bValue = loanB?.organization?.name || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }


    const sortedFundingColumns = fundingColumns.map(col => ({
        ...col,
        label: (
            <div className="flex items-center cursor-pointer hover:text-gray-900" onClick={() => handleSort(col.key)}>
                {typeof col.label === 'string' ? col.label : 'Column'}
                {sortConfig?.key === col.key && (
                    <span className="ml-1 font-bold text-gray-900">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
            </div>
        )
    }));

    // Similar wrapping for other columns would be ideal, but for brevity applying logic directly or wrapping helper
    const wrapSortParams = (cols: Column<any>[]) => cols.map(col => ({
        ...col,
        label: typeof col.label === 'string' ? (
            <div className="flex items-center cursor-pointer hover:text-gray-900 group" onClick={() => handleSort(col.key)}>
                {col.label}
                <span className={`ml-1 font-bold ${sortConfig?.key === col.key ? 'text-gray-900 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-50'}`}>
                    {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
            </div>
        ) : col.label
    }));


    const handleExport = () => {
        let data: any[] = [];
        let filename = 'report.csv';
        let headers: string[] = [];

        if (activeTab === 'funding') {
            data = getFilteredAndSortedLoans();
            filename = `funding_history_${new Date().toISOString().split('T')[0]}.csv`;
            headers = ['Funded Date', 'Loan #', 'Borrower', 'Organization', 'Amount'];
        } else if (activeTab === 'collections') {
            data = getFilteredAndSortedPayments();
            filename = `collection_history_${new Date().toISOString().split('T')[0]}.csv`;
            headers = ['Payment Date', 'Organization', 'Amount', 'Status'];
        } else if (activeTab === 'status') {
            data = getFilteredAndSortedLoans();
            filename = `account_status_${new Date().toISOString().split('T')[0]}.csv`;
            headers = ['Loan #', 'Created Date', 'Borrower', 'Organization', 'Status', 'Risk Level', 'Days Overdue', 'Balance'];
        }

        if (!data.length) return;

        const csvContent = [
            headers.join(','),
            ...data.map(item => {
                if (activeTab === 'funding') {
                    const l = item as LoanData;
                    return [
                        l.funding_date || '',
                        l.loan_number,
                        `"${l.borrower?.first_name} ${l.borrower?.last_name}"`,
                        `"${l.organization?.name || ''}"`,
                        l.principal_amount
                    ].join(',');
                } else if (activeTab === 'collections') {
                    const p = item as PaymentData;
                    const loan = loans.find(l => l.id === p.loan_id);
                    const orgName = loan?.organization?.name || '';
                    return [
                        p.payment_date,
                        `"${orgName}"`,
                        p.amount,
                        p.status
                    ].join(',');
                } else {
                    const l = item as LoanData;
                    return [
                        l.loan_number,
                        l.created_at,
                        `"${l.borrower?.first_name} ${l.borrower?.last_name}"`,
                        `"${l.organization?.name || ''}"`,
                        l.status,
                        l.days_overdue === 0 ? 'Low' : l.days_overdue <= 15 ? 'Medium' : 'High',
                        l.days_overdue,
                        l.remaining_balance
                    ].join(',');
                }
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-500 mt-1">Analytics and performance overview</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Dealer Longevity Badge - ALWAYS VISIBLE NOW */}
                    {longevity && (
                        <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100">
                            <Clock className="w-5 h-5" />
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Partner Since</span>
                                <span className="font-bold">{longevity}</span>
                            </div>
                        </div>
                    )}

                    {isAdmin && (
                        <select
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                        >
                            <option value="all">All Organizations</option>
                            {allOrganizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded-lg">+12%</span>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Collected</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">${stats.totalCollected.toLocaleString()}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Funded</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">${stats.totalFunded.toLocaleString()}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Default / At Risk</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.defaultedLoans} <span className="text-sm font-normal text-gray-500">loans</span></p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gray-100 rounded-xl">
                            <FileText className="w-6 h-6 text-gray-600" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Active Loans</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeLoans}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => { setActiveTab('funding'); setSortConfig({ key: 'date', direction: 'desc' }); }}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'funding'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Funding History
                        </button>
                        <button
                            onClick={() => { setActiveTab('collections'); setSortConfig({ key: 'date', direction: 'desc' }); }}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'collections'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Collection History
                        </button>
                        <button
                            onClick={() => { setActiveTab('status'); setSortConfig({ key: 'date', direction: 'desc' }); }}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'status'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Account Status
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'funding' && (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Funding History</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 mr-4">
                                        <span className="text-sm text-gray-500">Sort by:</span>
                                        <select
                                            className="border-gray-200 rounded-lg text-sm text-gray-900"
                                            value={`${sortConfig?.key}-${sortConfig?.direction}`}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                        >
                                            <option value="date-desc">Newest First</option>
                                            <option value="date-asc">Oldest First</option>
                                            <option value="amount-desc">Amount (High-Low)</option>
                                            <option value="amount-asc">Amount (Low-High)</option>
                                            {(isAdmin && selectedOrgId === 'all') && <option value="organization-asc">Organization (A-Z)</option>}
                                        </select>
                                    </div>

                                    <span className="text-sm text-gray-500">Date:</span>
                                    <input
                                        type="date"
                                        className="border-gray-200 rounded-lg text-sm text-gray-900"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="date"
                                        className="border-gray-200 rounded-lg text-sm text-gray-900"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <DataTable
                                data={getFilteredAndSortedLoans()}
                                columns={wrapSortParams(fundingColumns)}
                                loading={loading}
                                emptyState={{ title: 'No funded loans', description: 'No loans have been funded matching these criteria.', icon: <FileText className="w-8 h-8 text-gray-400" /> }}
                                getItemKey={(l) => l.id}
                            />
                        </div>
                    )}

                    {activeTab === 'collections' && (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Collection History</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 mr-4">
                                        <span className="text-sm text-gray-500">Sort by:</span>
                                        <select
                                            className="border-gray-200 rounded-lg text-sm text-gray-900"
                                            value={`${sortConfig?.key}-${sortConfig?.direction}`}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                        >
                                            <option value="date-desc">Newest First</option>
                                            <option value="date-asc">Oldest First</option>
                                            <option value="amount-desc">Amount (High-Low)</option>
                                            <option value="amount-asc">Amount (Low-High)</option>
                                            {(isAdmin && selectedOrgId === 'all') && <option value="organization-asc">Organization (A-Z)</option>}
                                        </select>
                                    </div>

                                    <span className="text-sm text-gray-500">Date:</span>
                                    <input
                                        type="date"
                                        className="border-gray-200 rounded-lg text-sm text-gray-900"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="date"
                                        className="border-gray-200 rounded-lg text-sm text-gray-900"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <DataTable
                                data={getFilteredAndSortedPayments()}
                                columns={wrapSortParams(collectionColumns)}
                                loading={loading}
                                emptyState={{ title: 'No collections', description: 'No payments have been collected matching these criteria.', icon: <DollarSign className="w-8 h-8 text-gray-400" /> }}
                                getItemKey={(p) => p.id}
                            />
                        </div>
                    )}

                    {activeTab === 'status' && (
                        <div>
                            <div className="flex flex-col space-y-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-900">Account Status Overview</h3>
                                    <div className="flex gap-2">
                                        {/* Legend for Risk */}
                                        <div className="flex items-center text-xs space-x-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-gray-600">Low Risk</span>
                                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span><span className="text-gray-600">Medium</span>
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-gray-600">High Risk</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters Toolbar */}
                                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex-1 min-w-[200px]">
                                        <input
                                            type="text"
                                            placeholder="Search loans, borrowers..."
                                            className="w-full border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="active_late">Late</option>
                                        <option value="defaulted">Defaulted</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                    <select
                                        className="border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
                                        value={riskFilter}
                                        onChange={(e) => setRiskFilter(e.target.value)}
                                    >
                                        <option value="all">Any Risk Level</option>
                                        <option value="green">Low Risk (Green)</option>
                                        <option value="yellow">Medium Risk (Yellow)</option>
                                        <option value="high">High Risk (Red)</option>
                                    </select>

                                    {/* Explicit Sort Dropdown for Status View */}
                                    <select
                                        className="border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
                                        value={`${sortConfig?.key}-${sortConfig?.direction}`}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                    >
                                        <option value="date-desc">Newest First</option>
                                        <option value="date-asc">Oldest First</option>
                                        <option value="borrower-asc">Borrower (A-Z)</option>
                                        <option value="borrower-desc">Borrower (Z-A)</option>
                                        {(isAdmin && selectedOrgId === 'all') && <option value="organization-asc">Organization (A-Z)</option>}
                                        <option value="balance-desc">Balance (High-Low)</option>
                                        <option value="balance-asc">Balance (Low-High)</option>
                                    </select>

                                    <button
                                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); setRiskFilter('all'); }}
                                        className="text-sm text-gray-500 hover:text-gray-700 px-2"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Export
                                    </button>
                                </div>
                            </div>
                            <DataTable
                                data={getFilteredAndSortedLoans()}
                                columns={wrapSortParams(statusColumns)}
                                loading={loading}
                                emptyState={{ title: 'No loans', description: 'No loans found matching criteria.', icon: <FileText className="w-8 h-8 text-gray-400" /> }}
                                getItemKey={(l) => l.id}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
