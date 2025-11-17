'use client';

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  mobileRender?: (item: T) => ReactNode;
  className?: string;
  show?: () => boolean;
}

export interface Action<T> {
  icon: LucideIcon;
  label: string;
  onClick: (item: T) => void;
  color?: 'blue' | 'green' | 'red' | 'gray';
  show?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  error?: string | null;
  emptyState?: {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
  };
  mobileCardRender?: (item: T) => ReactNode;
  getItemKey: (item: T) => string;
}

export default function DataTable<T>({
  data,
  columns,
  actions,
  loading = false,
  error = null,
  emptyState,
  mobileCardRender,
  getItemKey,
}: DataTableProps<T>) {
  
  const getActionColor = (color: string = 'gray') => {
    const colors = {
      blue: 'text-gray-400 hover:text-blue-500 hover:bg-blue-50',
      green: 'text-gray-400 hover:text-green-500 hover:bg-green-50',
      red: 'text-gray-400 hover:text-red-500 hover:bg-red-50',
      gray: 'text-gray-400 hover:text-gray-700 hover:bg-gray-50',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden">
        <div className="p-12 text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden">
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden">
        <div className="p-12 text-center">
          {emptyState.icon && (
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {emptyState.icon}
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900 mb-3">{emptyState.title}</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{emptyState.description}</p>
          {emptyState.action}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/30 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50">
            {data.map((item) => (
              <tr key={getItemKey(item)} className="hover:bg-white/50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className={`px-6 py-4 ${column.className || ''}`}>
                    {column.render(item)}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {actions.map((action, idx) => {
                        const shouldShow = action.show ? action.show(item) : true;
                        if (!shouldShow) return null;
                        
                        const Icon = action.icon;
                        return (
                          <button
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className={`p-2 rounded-lg transition-colors ${getActionColor(action.color)}`}
                            title={action.label}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 p-4">
        {data.map((item) => (
          <div key={getItemKey(item)} className="bg-white/50 rounded-2xl p-4 shadow-sm space-y-3">
            {mobileCardRender ? (
              mobileCardRender(item)
            ) : (
              <>
                {columns.map((column) => (
                  <div key={column.key}>
                    {column.mobileRender ? column.mobileRender(item) : column.render(item)}
                  </div>
                ))}
                {actions && actions.length > 0 && (
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
                    {actions.map((action, idx) => {
                      const shouldShow = action.show ? action.show(item) : true;
                      if (!shouldShow) return null;
                      
                      const Icon = action.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => action.onClick(item)}
                          className={`p-2 rounded-lg transition-colors ${getActionColor(action.color)}`}
                          title={action.label}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
