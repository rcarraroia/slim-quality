import { useState, useEffect, useCallback } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useCache<T>(options: CacheOptions) {
  const { ttl = 5 * 60 * 1000, key } = options; // Default 5 minutes
  const [cache, setCache] = useState<CacheEntry<T> | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(`cache_${key}`);
    if (stored) {
      try {
        const entry: CacheEntry<T> = JSON.parse(stored);
        const now = Date.now();
        
        if (now - entry.timestamp < ttl) {
          setCache(entry);
        } else {
          localStorage.removeItem(`cache_${key}`);
        }
      } catch (error) {
        console.error('Error loading cache:', error);
        localStorage.removeItem(`cache_${key}`);
      }
    }
  }, [key, ttl]);

  const set = useCallback((data: T) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    
    setCache(entry);
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }, [key]);

  const clear = useCallback(() => {
    setCache(null);
    localStorage.removeItem(`cache_${key}`);
  }, [key]);

  const isValid = useCallback(() => {
    if (!cache) return false;
    const now = Date.now();
    return now - cache.timestamp < ttl;
  }, [cache, ttl]);

  return {
    data: cache?.data,
    set,
    clear,
    isValid
  };
}
