"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, Check, SearchRequest, SearchResponse } from "@/lib/api";

const PAGE_SIZE = 100;

interface UseChecksSearchOptions {
  enabled?: boolean;
}

interface UseChecksSearchReturn {
  data: Check[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

const defaultRequest: SearchRequest = {
  sort: [{ field: "created_at", dir: "desc" }],
  limit: PAGE_SIZE,
  offset: 0,
};

export function useChecksSearch({
  enabled = true,
}: UseChecksSearchOptions = {}): UseChecksSearchReturn {
  const [data, setData] = useState<Check[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentOffsetRef = useRef(0);

  const fetchChecks = useCallback(async (append = false) => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      currentOffsetRef.current = 0;
    }
    setError(null);

    try {
      const request: SearchRequest = {
        ...defaultRequest,
        offset: append ? currentOffsetRef.current : 0,
      };
      const response: SearchResponse<Check> = await api.searchChecks(request);

      if (append) {
        setData(prev => [...prev, ...(response.data || [])]);
      } else {
        setData(response.data || []);
      }
      setTotal(response.total || 0);
      currentOffsetRef.current = (append ? currentOffsetRef.current : 0) + (response.data?.length || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch checks");
      if (!append) {
        setData([]);
        setTotal(0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [enabled]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || isLoading) return;
    if (currentOffsetRef.current >= total) return;
    fetchChecks(true);
  }, [fetchChecks, isLoadingMore, isLoading, total]);

  const refetch = useCallback(() => {
    currentOffsetRef.current = 0;
    fetchChecks(false);
  }, [fetchChecks]);

  const hasMore = currentOffsetRef.current < total;

  useEffect(() => {
    fetchChecks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    data,
    total,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMore,
    hasMore,
  };
}
