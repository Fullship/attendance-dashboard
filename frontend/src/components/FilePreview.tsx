import React from 'react';
import LazyImage from './LazyImage';

interface FilePreviewProps {
  file: File | string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  onRemove?: () => void;
  showFileName?: boolean;
}

/**
 * FilePreview component for displaying uploaded files with lazy loading
 * Supports images, documents, and other file types
 */
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  className = '',
  maxWidth = 200,
  maxHeight = 200,
  onRemove,
  showFileName = true,
}) => {
  const fileName = typeof file === 'string' ? file.split('/').pop() : file.name;
  const fileSize = typeof file === 'string' ? null : file.size;
  const fileType = typeof file === 'string' ? file.split('.').pop()?.toLowerCase() : file.type;

  // Check if file is an image
  const isImage =
    typeof file === 'string'
      ? /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
      : file.type.startsWith('image/');

  // Generate object URL for File objects
  const imageUrl = typeof file === 'string' ? file : isImage ? URL.createObjectURL(file) : null;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (type: string | undefined): string => {
    if (!type) return '📄';

    if (type.includes('pdf')) return '📕';
    if (type.includes('doc') || type.includes('word')) return '📘';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📗';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📙';
    if (type.includes('text')) return '📝';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';

    return '📄';
  };

  React.useEffect(() => {
    // Cleanup object URL when component unmounts
    return () => {
      if (imageUrl && typeof file !== 'string') {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl, file]);

  return (
    <div className={`relative group ${className}`}>
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
          aria-label="Remove file"
        >
          ×
        </button>
      )}

      {/* Image preview with lazy loading */}
      {isImage && imageUrl ? (
        <div className="relative">
          <LazyImage
            src={imageUrl}
            alt={fileName || 'File preview'}
            className="rounded-lg border-2 border-gray-200 dark:border-gray-600"
            width={maxWidth}
            height={maxHeight}
            style={{
              maxWidth: `${maxWidth}px`,
              maxHeight: `${maxHeight}px`,
            }}
          />

          {showFileName && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg">
              <div className="truncate" title={fileName}>
                {fileName}
              </div>
              {fileSize && <div className="text-gray-300">{formatFileSize(fileSize)}</div>}
            </div>
          )}
        </div>
      ) : (
        /* Non-image file preview */
        <div
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800"
          style={{
            width: `${maxWidth}px`,
            height: `${maxHeight}px`,
          }}
        >
          <div className="text-4xl mb-2">{getFileIcon(fileType)}</div>

          {showFileName && (
            <div className="text-center">
              <div
                className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-full"
                title={fileName}
              >
                {fileName}
              </div>
              {fileSize && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilePreview;
