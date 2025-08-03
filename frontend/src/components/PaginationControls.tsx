import React, { ReactNode } from 'react';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface PageInfo {
  start: number;
  end: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  isFirst: boolean;
  isLast: boolean;
}

interface PaginationControlsProps {
  pagination: PaginationData;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  getPageInfo: () => PageInfo;
  getPageNumbers: (maxVisible?: number) => number[];
  showLimitSelector?: boolean;
  showPageInfo?: boolean;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
  limitOptions?: number[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  pagination,
  loading = false,
  onPageChange,
  onLimitChange,
  getPageInfo,
  getPageNumbers,
  showLimitSelector = true,
  showPageInfo = true,
  showFirstLast = true,
  maxVisiblePages = 5,
  limitOptions = [10, 20, 50, 100],
  className = '',
  size = 'md',
}) => {
  const pageInfo = getPageInfo();
  const pageNumbers = getPageNumbers(maxVisiblePages);

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-sm',
      select: 'px-2 py-1 text-sm',
      text: 'text-sm',
    },
    md: {
      button: 'px-3 py-2 text-sm',
      select: 'px-3 py-2 text-sm',
      text: 'text-sm',
    },
    lg: {
      button: 'px-4 py-2 text-base',
      select: 'px-4 py-2 text-base',
      text: 'text-base',
    },
  } as const;

  const classes = sizeClasses[size];

  const buttonClass = `${classes.button} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`;
  const activeButtonClass = `${classes.button} border border-blue-500 bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`;

  if (pagination.pages <= 1 && !showLimitSelector && !showPageInfo) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4 ${className}`}
    >
      {/* Page Info */}
      {showPageInfo && (
        <div className={`${classes.text} text-gray-700 flex-shrink-0`}>
          {pageInfo.total > 0 ? (
            <>
              Showing <span className="font-medium">{pageInfo.start}</span> to{' '}
              <span className="font-medium">{pageInfo.end}</span> of{' '}
              <span className="font-medium">{pageInfo.total}</span> results
            </>
          ) : (
            'No results found'
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center space-x-1">
          {/* First Page */}
          {showFirstLast && (
            <button
              onClick={() => onPageChange(1)}
              disabled={pageInfo.isFirst || loading}
              className={`${buttonClass} rounded-l-md`}
              title="First page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pageInfo.hasPrev === false || loading}
            className={`${buttonClass} ${!showFirstLast ? 'rounded-l-md' : ''}`}
            title="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Page Numbers */}
          {pageNumbers.map(pageNum => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              className={pageNum === pagination.page ? activeButtonClass : buttonClass}
            >
              {pageNum}
            </button>
          ))}

          {/* Next Page */}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pageInfo.hasNext === false || loading}
            className={`${buttonClass} ${!showFirstLast ? 'rounded-r-md' : ''}`}
            title="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Last Page */}
          {showFirstLast && (
            <button
              onClick={() => onPageChange(pagination.pages)}
              disabled={pageInfo.isLast || loading}
              className={`${buttonClass} rounded-r-md`}
              title="Last page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Page Size Selector */}
      {showLimitSelector && (
        <div className="flex items-center space-x-2 flex-shrink-0">
          <label htmlFor="pageSize" className={`${classes.text} text-gray-700`}>
            Show:
          </label>
          <select
            id="pageSize"
            value={pagination.limit}
            onChange={e => onLimitChange(parseInt(e.target.value))}
            disabled={loading}
            className={`${classes.select} border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50`}
          >
            {limitOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className={`${classes.text} text-gray-700`}>per page</span>
        </div>
      )}
    </div>
  );
};

// Loading overlay component
interface PaginationLoadingProps {
  loading: boolean;
  children: ReactNode;
  className?: string;
}

export const PaginationLoading: React.FC<PaginationLoadingProps> = ({
  loading,
  children,
  className = '',
}) => {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-lg border">
          <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    </div>
  );
};

// Error display component
interface PaginationErrorProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export const PaginationError: React.FC<PaginationErrorProps> = ({
  error,
  onRetry,
  className = '',
}) => {
  if (!error) {
    return null;
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
          </div>
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Empty state component
interface PaginationEmptyProps {
  message?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const PaginationEmpty: React.FC<PaginationEmptyProps> = ({
  message = 'No items found',
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{message}</h3>
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default PaginationControls;
