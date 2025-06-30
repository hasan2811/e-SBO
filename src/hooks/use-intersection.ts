
'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

/**
 * A custom React hook to detect when an element enters the viewport.
 * @param options - Configuration options for the IntersectionObserver API.
 * @returns A tuple containing a ref to attach to the target element and a boolean indicating if it's intersecting.
 */
export function useIntersection(
  options?: IntersectionObserverInit
): [RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersecting(entry.isIntersecting);
      },
      options
    );

    const currentElement = ref.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options]);

  return [ref, isIntersecting];
}
