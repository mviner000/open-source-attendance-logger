// src/hooks/use-media-query.ts
import { useState, useEffect } from "react";

/**
 * Custom hook to detect if a given media query matches.
 * @param query - The CSS media query string.
 * @returns A boolean indicating if the media query matches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false; // Default value for SSR (Server-Side Rendering)
  });

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);
    setMatches(mediaQueryList.matches); // Set the initial state

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
