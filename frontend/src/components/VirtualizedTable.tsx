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
const VirtualizedTableRow = ({
  index,
  style,
  data: { items, columns, onRowClick, onRowSelect, selectedItems, rowClassName },
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
  const item = items[index];
  const isSelected = selectedItems?.has(index) || false;

  const handleRowClick = () => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onRowSelect) {
      onRowSelect(item, index, e.target.checked);
    }
  };

  const className =
    typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName || '';

  return (
    <div
      style={style}
      className={`
        flex items-center border-b border-gray-200 dark:border-gray-700 
        hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}
        ${onRowClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleRowClick}
    >
      {onRowSelect && (
        <div className="flex-shrink-0 px-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectChange}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      )}

      {columns.map((column: TableColumn, colIndex: number) => (
        <div
          key={column.key}
          className={`
            px-4 py-3 text-sm
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
            minWidth: column.minWidth || 100,
            flexShrink: 0,
          }}
        >
          {column.render(item, index)}
        </div>
      ))}
    </div>
  );
};

// Main Virtualized Table Component
export const VirtualizedTable = ({
  data,
  height,
  itemHeight,
  columns,
  onRowClick,
  onRowSelect,
  selectedItems,
  className = '',
  headerClassName = '',
  rowClassName,
  emptyMessage = 'No data available',
  loading = false,
  stickyHeader = true,
}: VirtualizedTableProps) => {
  const itemData = useMemo(
    () => ({
      items: data,
      columns,
      onRowClick,
      onRowSelect,
      selectedItems,
      rowClassName,
    }),
    [data, columns, onRowClick, onRowSelect, selectedItems, rowClassName]
  );

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {columns.map((column: TableColumn) => (
                <div
                  key={column.key}
                  className="px-4 py-3 flex-1"
                  style={{ width: column.width || `${100 / columns.length}%` }}
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows skeleton */}
          {Array.from({ length: Math.min(10, Math.floor(height / 60)) }).map((_, index) => (
            <div key={index} className="flex border-b border-gray-200 dark:border-gray-700">
              {columns.map((column: TableColumn) => (
                <div
                  key={column.key}
                  className="px-4 py-3 flex-1"
                  style={{ width: column.width || `${100 / columns.length}%` }}
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        {/* Header */}
        <div
          className={`
          bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
          ${stickyHeader ? 'sticky top-0 z-10' : ''}
          ${headerClassName}
        `}
        >
          <div className="flex">
            {onRowSelect && (
              <div className="flex-shrink-0 px-4 py-3">
                <input
                  type="checkbox"
                  disabled
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
                  minWidth: column.minWidth || 100,
                  flexShrink: 0,
                }}
              >
                {column.header}
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div
        className={`
        bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
        ${stickyHeader ? 'sticky top-0 z-10' : ''}
        ${headerClassName}
      `}
      >
        <div className="flex">
          {onRowSelect && (
            <div className="flex-shrink-0 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedItems?.size === data.length && data.length > 0}
                onChange={e => {
                  if (onRowSelect) {
                    data.forEach((item: any, index: number) => {
                      onRowSelect(item, index, e.target.checked);
                    });
                  }
                }}
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
                minWidth: column.minWidth || 100,
                flexShrink: 0,
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
  const [data, setData] = React.useState<any[]>(initialData);
  const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
  const [loading, setLoading] = React.useState(false);

  const handleRowSelect = React.useCallback((item: any, index: number, selected: boolean) => {
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

  const selectAll = React.useCallback(() => {
    setSelectedItems(new Set(data.map((_, index) => index)));
  }, [data]);

  const clearSelection = React.useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const getSelectedData = React.useCallback(() => {
    return Array.from(selectedItems)
      .map(index => data[index])
      .filter(Boolean);
  }, [data, selectedItems]);

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
