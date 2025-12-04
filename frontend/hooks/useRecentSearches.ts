"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "logs-recent-searches";
const MAX_RECENT = 10;

export interface RecentSearch {
  query: string;
  timestamp: number;
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        setSearches(parsed);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save to localStorage whenever searches change
  const saveToStorage = useCallback((newSearches: RecentSearch[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSearches));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const addSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      setSearches((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter((s) => s.query !== query);
        // Add to front
        const newSearches = [{ query, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);
        saveToStorage(newSearches);
        return newSearches;
      });
    },
    [saveToStorage]
  );

  const removeSearch = useCallback(
    (query: string) => {
      setSearches((prev) => {
        const newSearches = prev.filter((s) => s.query !== query);
        saveToStorage(newSearches);
        return newSearches;
      });
    },
    [saveToStorage]
  );

  const clearSearches = useCallback(() => {
    setSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
