'use client';

import { LoanListItem, AdminLoanListItem } from '@/types/loan';

export type LoanFilterStatus = 
  | 'all'
  | 'on_time'
  | 'late'
  | 'pending_review'
  | 'derogatory'
  | 'settled'
  | 'closed'
  | 'active';

interface FilterOption {
  value: LoanFilterStatus;
  label: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  activeColor: string;
  activeBgColor: string;
}

const filterOptions: FilterOption[] = [
  {
    value: 'all',
    label: 'All Loans',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    hoverColor: 'hover:bg-gray-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-gray-700',
  },
  {
    value: 'on_time',
    label: 'On Time',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-green-600',
  },
  {
    value: 'late',
    label: 'Late',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    hoverColor: 'hover:bg-yellow-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-yellow-600',
  },
  {
    value: 'pending_review',
    label: 'Pending Review',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    hoverColor: 'hover:bg-orange-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-orange-600',
  },
  {
    value: 'derogatory',
    label: 'Derogatory',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-red-600',
  },
  {
    value: 'settled',
    label: 'Settled',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-purple-600',
  },
  {
    value: 'closed',
    label: 'Closed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    hoverColor: 'hover:bg-gray-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-gray-600',
  },
  {
    value: 'active',
    label: 'Active',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100',
    activeColor: 'text-white',
    activeBgColor: 'bg-blue-600',
  },
];

interface LoanStatusFiltersProps {
  selectedFilter: LoanFilterStatus;
  onFilterChange: (filter: LoanFilterStatus) => void;
  loans: (LoanListItem | AdminLoanListItem)[];
}

export default function LoanStatusFilters({
  selectedFilter,
  onFilterChange,
  loans,
}: LoanStatusFiltersProps) {
  
  // Calculate counts for each filter
  const getCounts = () => {
    const counts: Record<LoanFilterStatus, number> = {
      all: loans.length,
      on_time: 0,
      late: 0,
      pending_review: 0,
      derogatory: 0,
      settled: 0,
      closed: 0,
      active: 0,
    };

    loans.forEach((loan) => {
      // On time: funded or active, not late, not derogatory
      if ((loan.status === 'funded' || loan.status === 'active') && !loan.derogatory_status && !loan.is_late) {
        counts.on_time++;
      }
      
      // Late: has overdue invoices
      if (loan.is_late && !loan.derogatory_status) {
        counts.late++;
      }
      
      // Pending review
      if (loan.status === 'pending_derogatory_review') {
        counts.pending_review++;
      }
      
      // Derogatory
      if (loan.status === 'derogatory' || loan.derogatory_status) {
        counts.derogatory++;
      }
      
      // Settled
      if (loan.status === 'settled') {
        counts.settled++;
      }
      
      // Closed
      if (loan.status === 'closed') {
        counts.closed++;
      }
      
      // Active (funded and active status)
      if (loan.status === 'active' || loan.status === 'funded') {
        counts.active++;
      }
    });

    return counts;
  };

  const counts = getCounts();

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Filter by Status</h3>
        <span className="text-xs text-gray-500">
          {counts[selectedFilter]} {selectedFilter === 'all' ? 'total' : selectedFilter.replace('_', ' ')}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = selectedFilter === option.value;
          const count = counts[option.value];
          
          return (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`
                px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200
                flex items-center space-x-2
                ${isActive 
                  ? `${option.activeBgColor} ${option.activeColor} shadow-md scale-105` 
                  : `${option.bgColor} ${option.color} ${option.hoverColor}`
                }
              `}
            >
              <span>{option.label}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/50'
                }
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helper function to filter loans based on selected status
 */
export function filterLoansByStatus(
  loans: (LoanListItem | AdminLoanListItem)[],
  filterStatus: LoanFilterStatus
): (LoanListItem | AdminLoanListItem)[] {
  if (filterStatus === 'all') {
    return loans;
  }

  return loans.filter((loan) => {
    switch (filterStatus) {
      case 'on_time':
        return (loan.status === 'funded' || loan.status === 'active') && !loan.derogatory_status && !loan.is_late;
      
      case 'late':
        return loan.is_late === true && !loan.derogatory_status;
      
      case 'pending_review':
        return loan.status === 'pending_derogatory_review';
      
      case 'derogatory':
        return loan.status === 'derogatory' || loan.derogatory_status === true;
      
      case 'settled':
        return loan.status === 'settled';
      
      case 'closed':
        return loan.status === 'closed';
      
      case 'active':
        return loan.status === 'active' || loan.status === 'funded';
      
      default:
        return true;
    }
  });
}
