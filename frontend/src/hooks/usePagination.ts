import { useState, useEffect, useCallback } from 'react';

// Type definitions
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PageInfo {
  start: number;
  end: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface PaginationState<T = any> {
  data: T;
  pagination: PaginationInfo;
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}

export interface PaginationOptions<T = any> {
  initialPage?: number;
  initialLimit?: number;
  autoLoad?: boolean;
  transform?: (data: any) => T;
  onError?: (error: Error) => void;
  dependencies?: any[];
}

export interface PaginationResult<T = any> {
  // State
  data: T;
  pagination: PaginationInfo;
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
  params: Record<string, any>;

  // Navigation
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  changeLimit: (newLimit: number) => void;

  // Data management
  updateParams: (newParams: Record<string, any>) => void;
  refresh: () => void;
  reset: () => void;

  // Utilities
  getPageInfo: () => PageInfo;
  getPageNumbers: (maxVisible?: number) => number[];

  // Raw fetch function for custom usage
  fetchData: (page?: number, limit?: number, customParams?: Record<string, any>) => Promise<void>;
}

/**
 * Custom hook for managing paginated API calls
 * @param baseUrl - The base API endpoint URL
 * @param defaultParams - Default query parameters
 * @param options - Configuration options
 * @returns Pagination state and controls
 */
export const usePagination = <T = any>(
  baseUrl: string,
  defaultParams: Record<string, any> = {},
  options: PaginationOptions<T> = {}
): PaginationResult<T> => {
  const {
    initialPage = 1,
    initialLimit = 20,
    autoLoad = true,
    transform = (data: any) => data as T, // Transform function for response data
    onError = (error: Error) => console.error('Pagination error:', error),
    dependencies = [], // Additional dependencies for refetching
  } = options;

  const [state, setState] = useState<PaginationState<T>>({
    data: [] as unknown as T,
    pagination: {
      page: initialPage,
      limit: initialLimit,
      total: 0,
      pages: 0,
    },
    loading: false,
    error: null,
    lastFetch: null,
  });

  const [params, setParams] = useState<Record<string, any>>(defaultParams);

  // Fetch data function
  const fetchData = useCallback(
    async (
      page = state.pagination.page,
      limit = state.pagination.limit,
      customParams: Record<string, any> = {}
    ) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...params,
          ...customParams,
        });

        const response = await fetch(`${baseUrl}?${queryParams}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Handle different response formats
        let data: any, pagination: any;

        if (result.data && result.pagination) {
          // Format: { data: [...], pagination: {...} }
          data = result.data;
          pagination = result.pagination;
        } else if (result.pagination) {
          // Format: { items: [...], pagination: {...} } or similar
          const dataKey = Object.keys(result).find(
            key => key !== 'pagination' && Array.isArray(result[key])
          );
          data = dataKey ? result[dataKey] : [];
          pagination = result.pagination;
        } else if (Array.isArray(result)) {
          // Simple array format (fallback)
          data = result;
          pagination = {
            page,
            limit,
            total: result.length,
            pages: 1,
          };
        } else {
          // Complex nested format (like settings endpoint)
          data = result;
          pagination = {
            page,
            limit,
            total: 1,
            pages: 1,
          };
        }

        // Apply transform function
        const transformedData = transform(data);

        setState(prev => ({
          ...prev,
          data: transformedData,
          pagination: {
            page: pagination.page || page,
            limit: pagination.limit || limit,
            total: pagination.total || 0,
            pages:
              pagination.pages || Math.ceil((pagination.total || 0) / (pagination.limit || limit)),
          },
          loading: false,
          lastFetch: new Date().toISOString(),
        }));
      } catch (err) {
        const error = err as Error;
        const errorMessage = error.message || 'Failed to fetch data';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        onError(error);
      }
    },
    [baseUrl, params, transform, onError]
  );

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= state.pagination.pages) {
        fetchData(page, state.pagination.limit);
      }
    },
    [fetchData, state.pagination.pages, state.pagination.limit]
  );

  const nextPage = useCallback(() => {
    if (state.pagination.page < state.pagination.pages) {
      goToPage(state.pagination.page + 1);
    }
  }, [goToPage, state.pagination.page, state.pagination.pages]);

  const prevPage = useCallback(() => {
    if (state.pagination.page > 1) {
      goToPage(state.pagination.page - 1);
    }
  }, [goToPage, state.pagination.page]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(state.pagination.pages);
  }, [goToPage, state.pagination.pages]);

  const changeLimit = useCallback(
    (newLimit: number) => {
      const currentPage = state.pagination.page;
      const currentStart = (currentPage - 1) * state.pagination.limit;
      const newPage = Math.floor(currentStart / newLimit) + 1;

      fetchData(newPage, newLimit);
    },
    [fetchData, state.pagination.page, state.pagination.limit]
  );

  // Update params and refetch
  const updateParams = useCallback(
    (newParams: Record<string, any>) => {
      setParams(prev => ({
        ...prev,
        ...newParams,
      }));
      // Reset to first page when params change
      fetchData(1, state.pagination.limit, newParams);
    },
    [fetchData, state.pagination.limit]
  );

  // Refresh current page
  const refresh = useCallback(() => {
    fetchData(state.pagination.page, state.pagination.limit);
  }, [fetchData, state.pagination.page, state.pagination.limit]);

  // Reset pagination
  const reset = useCallback(() => {
    setParams(defaultParams);
    fetchData(initialPage, initialLimit, defaultParams);
  }, [fetchData, defaultParams, initialPage, initialLimit]);

  // Auto-load effect
  useEffect(() => {
    if (autoLoad) {
      fetchData(initialPage, initialLimit);
    }
  }, [autoLoad, initialPage, initialLimit, ...dependencies]);

  // Helper functions for pagination info
  const getPageInfo = useCallback((): PageInfo => {
    const { page, limit, total } = state.pagination;
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return {
      start,
      end,
      total,
      hasNext: page < state.pagination.pages,
      hasPrev: page > 1,
      isFirst: page === 1,
      isLast: page === state.pagination.pages,
    };
  }, [state.pagination]);

  const getPageNumbers = useCallback(
    (maxVisible = 5): number[] => {
      const { page, pages } = state.pagination;
      const numbers: number[] = [];

      if (pages <= maxVisible) {
        for (let i = 1; i <= pages; i++) {
          numbers.push(i);
        }
      } else {
        const start = Math.max(1, page - Math.floor(maxVisible / 2));
        const end = Math.min(pages, start + maxVisible - 1);
        const adjustedStart = Math.max(1, end - maxVisible + 1);

        for (let i = adjustedStart; i <= end; i++) {
          numbers.push(i);
        }
      }

      return numbers;
    },
    [state.pagination]
  );

  return {
    // State
    data: state.data,
    pagination: state.pagination,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    params,

    // Navigation
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changeLimit,

    // Data management
    updateParams,
    refresh,
    reset,

    // Utilities
    getPageInfo,
    getPageNumbers,

    // Raw fetch function for custom usage
    fetchData,
  };
};

export default usePagination;
