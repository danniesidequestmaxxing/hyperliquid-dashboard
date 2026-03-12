'use client';

import { useState, useEffect } from 'react';

export function useApiData<T>(
  url: string,
  fallback: (() => T) | null = null,
  refreshInterval = 0
): { data: T | null; loading: boolean; error: string | null; isLive: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // Skip fetch for mock/fallback-only URLs
        if (url.startsWith('__')) throw new Error('mock-only');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          // Check if it's an error response
          if (json.error) throw new Error(json.error);
          setData(json);
          setIsLive(true);
          setError(null);
        }
      } catch (err) {
        console.warn(`API fetch failed for ${url}, using fallback:`, err);
        if (!cancelled && fallback) {
          setData(fallback());
          setIsLive(false);
          setError(null);
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    // Set up refresh interval if specified
    let interval: ReturnType<typeof setInterval> | undefined;
    if (refreshInterval > 0) {
      interval = setInterval(fetchData, refreshInterval);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [url, refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, isLive };
}
