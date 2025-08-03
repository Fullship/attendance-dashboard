import React from 'react';

interface UploadProgressIndicatorProps {
  uploadId: number;
  phase: 'processing' | 'completed' | 'failed';
  totalRecords?: number;
  processedCount?: number;
  errorCount?: number;
  progress?: number;
  currentRecord?: number;
  status?: string;
  error?: string;
}

const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  uploadId,
  phase,
  totalRecords = 0,
  processedCount = 0,
  errorCount = 0,
  progress = 0,
  currentRecord = 0,
  status,
  error
}) => {
  const getStatusColor = () => {
    switch (phase) {
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return errorCount > 0 ? 'bg-yellow-500' : 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (phase) {
      case 'processing':
        return `Processing ${currentRecord} of ${totalRecords} records...`;
      case 'completed':
        return errorCount > 0 
          ? `Completed with ${errorCount} errors` 
          : `Completed successfully`;
      case 'failed':
        return `Failed: ${error || 'Unknown error'}`;
      default:
        return 'Unknown status';
    }
  };

  const getIcon = () => {
    switch (phase) {
      case 'processing':
        return (
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Upload #{uploadId}
        </h4>
        <div className={`flex items-center space-x-2 px-2 py-1 rounded-full ${getStatusColor()}`}>
          {getIcon()}
          <span className="text-xs font-medium text-white capitalize">{phase}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getStatusText()}
        </p>

        {phase === 'processing' && (
          <>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{progress}%</span>
              <span>{processedCount} processed, {errorCount} errors</span>
            </div>
          </>
        )}

        {phase === 'completed' && (
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Total: {totalRecords} records</span>
            <span>Processed: {processedCount}, Errors: {errorCount}</span>
          </div>
        )}

        {phase === 'failed' && error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadProgressIndicator;
