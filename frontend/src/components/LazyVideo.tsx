import React, { useState, useRef, useEffect } from 'react';

interface LazyVideoProps {
  src: string | string[];
  poster?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  style?: React.CSSProperties;
}

/**
 * LazyVideo component with modern lazy loading techniques
 * Features:
 * - IntersectionObserver for viewport detection
 * - Progressive loading with poster images
 * - Multiple source format support
 * - Loading states and error handling
 * - Accessibility features
 */
export const LazyVideo: React.FC<LazyVideoProps> = ({
  src,
  poster,
  className = '',
  width,
  height,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  preload = 'none',
  onLoad,
  onError,
  priority = false,
  style,
}) => {
  const [isIntersecting, setIsIntersecting] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before element enters viewport
        threshold: 0.1,
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoadedData = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const shouldLoad = priority || isIntersecting;
  const sources = Array.isArray(src) ? src : [src];

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height, ...style }}>
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <span className="text-sm text-gray-500">Loading video...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          role="img"
          aria-label="Failed to load video"
        >
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Video failed to load</span>
          </div>
        </div>
      )}

      {/* Main video element */}
      {shouldLoad && (
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          width={width}
          height={height}
          controls={controls}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          preload={preload}
          poster={poster}
          onLoadedData={handleLoadedData}
          onError={handleError}
          style={style}
        >
          {sources.map((source, index) => {
            const extension = source.split('.').pop()?.toLowerCase();
            let mimeType = 'video/mp4'; // default

            switch (extension) {
              case 'webm':
                mimeType = 'video/webm';
                break;
              case 'ogv':
              case 'ogg':
                mimeType = 'video/ogg';
                break;
              case 'mov':
                mimeType = 'video/quicktime';
                break;
              default:
                mimeType = 'video/mp4';
            }

            return <source key={index} src={source} type={mimeType} />;
          })}

          {/* Fallback message for browsers that don't support video */}
          <p className="text-gray-500 text-center p-4">
            Your browser does not support the video tag.
            <a
              href={sources[0]}
              className="text-blue-600 hover:text-blue-800 ml-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download the video
            </a>
          </p>
        </video>
      )}
    </div>
  );
};

export default LazyVideo;
