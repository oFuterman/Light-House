"use client";

import { useState, useEffect, useCallback } from "react";
import { api, CheckResultSearchDTO, SearchRequest, SearchResponse } from "@/lib/api";

interface UseCheckResultsSearchReturn {
  data: CheckResultSearchDTO[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCheckResultsSearch(
  checkId: string | number,
  searchRequest: SearchRequest
): UseCheckResultsSearchReturn {
  const [data, setData] = useState<CheckResultSearchDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!checkId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response: SearchResponse<CheckResultSearchDTO> = await api.searchCheckResults(
        checkId,
        searchRequest
      );
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search results");
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [checkId, searchRequest]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return {
    data,
    total,
    isLoading,
    error,
    refetch: fetchResults,
  };
}
