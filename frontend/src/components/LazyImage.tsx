import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
  blurDataURL?: string;
  priority?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
}

/**
 * LazyImage component with modern lazy loading techniques
 * Features:
 * - Native loading="lazy" for modern browsers
 * - IntersectionObserver fallback for older browsers
 * - Blur placeholder support
 * - Loading states and error handling
 * - Progressive enhancement
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  width,
  height,
  onLoad,
  onError,
  blurDataURL,
  priority = false,
  sizes,
  style,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // IntersectionObserver for fallback support
  useEffect(() => {
    if (priority) return;

    // Check if browser supports native lazy loading
    if ('loading' in HTMLImageElement.prototype) {
      setIsIntersecting(true);
      return;
    }

    // Fallback to IntersectionObserver for older browsers
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before element enters viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const shouldUseNativeLazy = !priority && 'loading' in HTMLImageElement.prototype;
  const shouldLoad = priority || isIntersecting;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height, ...style }}>
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Loading placeholder */}
      {!blurDataURL && !isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center"
          aria-hidden="true"
        >
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          role="img"
          aria-label="Failed to load image"
        >
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Image failed to load</span>
          </div>
        </div>
      )}

      {/* Main image */}
      {shouldLoad && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={shouldUseNativeLazy ? 'lazy' : undefined}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          style={style}
        />
      )}
    </div>
  );
};

export default LazyImage;
