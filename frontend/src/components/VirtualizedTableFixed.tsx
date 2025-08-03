import React, { useMemo, useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

// Types for virtualized table
export interface VirtualizedTableProps {
  data: any[];
  height: number;
  itemHeight: number;
  columns: TableColumn[];
  onRowClick?: (item: any, index: number) => void;
  onRowSelect?: (item: any, index: number, selected: boolean) => void;
  selectedItems?: Set<number | string>;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: any, index: number) => string);
  emptyMessage?: string;
  loading?: boolean;
  stickyHeader?: boolean;
}

export interface TableColumn {
  key: string;
  header: string;
  width?: string | number;
  minWidth?: string | number;
  render: (item: any, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

// Virtualized Table Row Component
const VirtualizedTableRow = React.memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      items: any[];
      columns: TableColumn[];
      onRowClick?: (item: any, index: number) => void;
      onRowSelect?: (item: any, index: number, selected: boolean) => void;
      selectedItems?: Set<number | string>;
      rowClassName?: string | ((item: any, index: number) => string);
    };
  }) => {
    const { items, columns, onRowClick, onRowSelect, selectedItems, rowClassName } = data;
    const item = items[index];
    const isSelected = selectedItems?.has(index) || false;

    const handleRowClick = useCallback(() => {
      onRowClick?.(item, index);
    }, [item, index, onRowClick]);

    const handleRowSelect = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        onRowSelect?.(item, index, e.target.checked);
      },
      [item, index, onRowSelect]
    );

    const computedRowClassName = useMemo(() => {
      const baseClassName = `
      flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800
      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
      ${onRowClick ? 'cursor-pointer' : ''}
    `;

      if (typeof rowClassName === 'function') {
        return `${baseClassName} ${rowClassName(item, index)}`;
      }
      return `${baseClassName} ${rowClassName || ''}`;
    }, [isSelected, onRowClick, rowClassName, item, index]);

    return (
      <div style={style} className={computedRowClassName} onClick={handleRowClick}>
        {onRowSelect && (
          <div className="flex-shrink-0 px-4 py-3 flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleRowSelect}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}
        {columns.map((column: TableColumn) => (
          <div
            key={column.key}
            className={`
            px-4 py-3 flex items-center
            ${
              column.align === 'center'
                ? 'justify-center'
                : column.align === 'right'
                ? 'justify-end'
                : 'justify-start'
            }
          `}
            style={{
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.minWidth || 'auto',
            }}
          >
            {column.render(item, index)}
          </div>
        ))}
      </div>
    );
  }
);

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

// Loading skeleton component
const LoadingSkeleton = React.memo(
  ({ columns, className }: { columns: TableColumn[]; className?: string }) => (
    <div className={`w-full ${className}`}>
      <div className="animate-pulse">
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {columns.map((column: TableColumn) => (
              <div
                key={column.key}
                className="px-4 py-3"
                style={{ width: column.width || `${100 / columns.length}%` }}
              >
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex border-b border-gray-200 dark:border-gray-700">
            {columns.map((column: TableColumn) => (
              <div
                key={column.key}
                className="px-4 py-3"
                style={{ width: column.width || `${100 / columns.length}%` }}
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Empty state component
const EmptyState = React.memo(
  ({ emptyMessage, className }: { emptyMessage: string; className?: string }) => (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm">{emptyMessage}</p>
        </div>
      </div>
    </div>
  )
);

EmptyState.displayName = 'EmptyState';

// Main VirtualizedTable component
const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  height,
  itemHeight,
  columns,
  onRowClick,
  onRowSelect,
  selectedItems = new Set(),
  className = '',
  headerClassName = '',
  rowClassName = '',
  emptyMessage = 'No data available',
  loading = false,
  stickyHeader = true,
}) => {
  // All hooks must be called before any early returns
  const itemData = useMemo(
    () => ({
      items: data || [],
      columns,
      onRowClick,
      onRowSelect,
      selectedItems,
      rowClassName,
    }),
    [data, columns, onRowClick, onRowSelect, selectedItems, rowClassName]
  );

  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onRowSelect && data) {
        data.forEach((item: any, index: number) => {
          onRowSelect(item, index, e.target.checked);
        });
      }
    },
    [data, onRowSelect]
  );

  const isAllSelected = data ? selectedItems.size === data.length && data.length > 0 : false;
  const isIndeterminate = selectedItems.size > 0 && data ? selectedItems.size < data.length : false;

  // Show loading state
  if (loading) {
    return <LoadingSkeleton columns={columns} className={className} />;
  }

  // Show empty state
  if (!data || data.length === 0) {
    return <EmptyState emptyMessage={emptyMessage} className={className} />;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Table Header */}
      <div
        className={`
        bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
        ${stickyHeader ? 'sticky top-0 z-10' : ''}
        ${headerClassName}
      `}
      >
        <div className="flex">
          {onRowSelect && (
            <div className="flex-shrink-0 px-4 py-3 flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          )}
          {columns.map((column: TableColumn) => (
            <div
              key={column.key}
              className={`
                px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                ${
                  column.align === 'center'
                    ? 'text-center'
                    : column.align === 'right'
                    ? 'text-right'
                    : 'text-left'
                }
              `}
              style={{
                width: column.width || `${100 / columns.length}%`,
                minWidth: column.minWidth || 'auto',
              }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized List */}
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        itemData={itemData}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {VirtualizedTableRow}
      </List>
    </div>
  );
};

// Hook for managing virtualized table state
export const useVirtualizedTable = (initialData: any[] = []) => {
  const [data, setData] = useState(initialData);
  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(new Set());
  const [loading, setLoading] = useState(false);

  const handleRowSelect = useCallback((item: any, index: number, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(Array.from({ length: data.length }, (_, i) => i)));
  }, [data.length]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const getSelectedData = useCallback(() => {
    return Array.from(selectedItems)
      .map(index => data[Number(index)])
      .filter(Boolean);
  }, [selectedItems, data]);

  return {
    data,
    setData,
    selectedItems,
    setSelectedItems,
    loading,
    setLoading,
    handleRowSelect,
    selectAll,
    clearSelection,
    getSelectedData,
  };
};

export default VirtualizedTable;
