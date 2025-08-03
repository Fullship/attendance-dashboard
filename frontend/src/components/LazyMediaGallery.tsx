import React, { useState } from 'react';
import LazyImage from './LazyImage';
import LazyVideo from './LazyVideo';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  src: string | string[];
  alt?: string;
  poster?: string;
  caption?: string;
  blurDataURL?: string;
}

interface LazyMediaGalleryProps {
  items: MediaItem[];
  className?: string;
  columns?: number;
  gap?: number;
  showCaptions?: boolean;
  onItemClick?: (item: MediaItem, index: number) => void;
}

/**
 * LazyMediaGallery component for displaying a collection of images and videos
 * with lazy loading and responsive grid layout
 */
export const LazyMediaGallery: React.FC<LazyMediaGalleryProps> = ({
  items,
  className = '',
  columns = 3,
  gap = 16,
  showCaptions = true,
  onItemClick,
}) => {
  const [loadedItems, setLoadedItems] = useState<Set<string>>(new Set());
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());

  const handleItemLoad = (itemId: string) => {
    setLoadedItems(prev => new Set(prev).add(itemId));
  };

  const handleItemError = (itemId: string) => {
    setErrorItems(prev => new Set(prev).add(itemId));
  };

  const handleItemClick = (item: MediaItem, index: number) => {
    onItemClick?.(item, index);
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Gallery stats */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        <span>
          {items.length} items • {loadedItems.size} loaded
          {errorItems.size > 0 && ` • ${errorItems.size} failed`}
        </span>
      </div>

      {/* Gallery grid */}
      <div style={gridStyle} className="w-full">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="relative group cursor-pointer transition-transform hover:scale-105"
            onClick={() => handleItemClick(item, index)}
          >
            {/* Media container */}
            <div className="relative aspect-square overflow-hidden rounded-lg shadow-md">
              {item.type === 'image' ? (
                <LazyImage
                  src={Array.isArray(item.src) ? item.src[0] : item.src}
                  alt={item.alt || `Gallery item ${index + 1}`}
                  className="w-full h-full"
                  blurDataURL={item.blurDataURL}
                  onLoad={() => handleItemLoad(item.id)}
                  onError={() => handleItemError(item.id)}
                />
              ) : (
                <LazyVideo
                  src={item.src}
                  poster={item.poster}
                  className="w-full h-full"
                  controls={false}
                  muted
                  onLoad={() => handleItemLoad(item.id)}
                  onError={() => handleItemError(item.id)}
                />
              )}

              {/* Overlay for video items */}
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white bg-opacity-90 rounded-full p-3">
                    <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {!loadedItems.has(item.id) && !errorItems.has(item.id) && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              )}

              {/* Error indicator */}
              {errorItems.has(item.id) && (
                <div className="absolute inset-0 bg-red-50 dark:bg-red-900 flex items-center justify-center">
                  <div className="text-center text-red-500">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs">Failed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Caption */}
            {showCaptions && item.caption && (
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 text-center">
                {item.caption}
              </div>
            )}

            {/* Media type badge */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {item.type === 'image' ? '📷' : '🎥'}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
          <p>No media items to display</p>
        </div>
      )}
    </div>
  );
};

export default LazyMediaGallery;
