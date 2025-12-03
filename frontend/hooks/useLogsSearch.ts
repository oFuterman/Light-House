"use client";

import { useState, useEffect, useCallback } from "react";
import { api, LogEntry, SearchRequest, SearchResponse } from "@/lib/api";

interface UseLogsSearchOptions {
  initialRequest?: SearchRequest;
  enabled?: boolean;
}

interface UseLogsSearchReturn {
  data: LogEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  search: (request: SearchRequest) => void;
  request: SearchRequest;
  setRequest: (request: SearchRequest) => void;
}

const defaultRequest: SearchRequest = {
  time_range: {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  filters: [],
  tags: [],
  sort: [{ field: "timestamp", dir: "desc" }],
  limit: 100,
  offset: 0,
};

export function useLogsSearch({
  initialRequest = defaultRequest,
  enabled = true,
}: UseLogsSearchOptions = {}): UseLogsSearchReturn {
  const [data, setData] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<SearchRequest>(initialRequest);

  const fetchLogs = useCallback(async (searchRequest: SearchRequest) => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response: SearchResponse<LogEntry> = await api.searchLogs(searchRequest);
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search logs");
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  const search = useCallback((newRequest: SearchRequest) => {
    setRequest(newRequest);
    fetchLogs(newRequest);
  }, [fetchLogs]);

  const refetch = useCallback(() => {
    fetchLogs(request);
  }, [fetchLogs, request]);

  useEffect(() => {
    fetchLogs(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    data,
    total,
    isLoading,
    error,
    refetch,
    search,
    request,
    setRequest,
  };
}
