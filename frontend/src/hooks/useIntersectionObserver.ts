import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  skip?: boolean;
}

/**
 * Custom hook for IntersectionObserver API
 * Provides viewport intersection detection for lazy loading
 */
export const useIntersectionObserver = (options: UseIntersectionObserverOptions = {}) => {
  const { rootMargin = '0px', threshold = 0.1, triggerOnce = true, skip = false } = options;

  const [isIntersecting, setIsIntersecting] = useState(skip);
  const [hasIntersected, setHasIntersected] = useState(skip);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (skip) return;

    const element = elementRef.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      setHasIntersected(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);

        if (isElementIntersecting) {
          setHasIntersected(true);

          if (triggerOnce) {
            observer.disconnect();
          }
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce, skip]);

  return {
    elementRef,
    isIntersecting: skip || isIntersecting,
    hasIntersected: skip || hasIntersected,
  };
};

export default useIntersectionObserver;
