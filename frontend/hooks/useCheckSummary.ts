"use client";

import { useState, useEffect } from "react";
import { api, CheckSummary } from "@/lib/api";

interface UseCheckSummaryOptions {
  checkId: number;
  windowHours?: number;
  enabled?: boolean;
  refreshTrigger?: number;
}

interface UseCheckSummaryReturn {
  summary: CheckSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCheckSummary({
  checkId,
  windowHours = 24,
  enabled = true,
  refreshTrigger = 0,
}: UseCheckSummaryOptions): UseCheckSummaryReturn {
  const [summary, setSummary] = useState<CheckSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!enabled || checkId <= 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getCheckSummary(checkId, windowHours);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch summary");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [checkId, windowHours, enabled, refreshTrigger]);

  return { summary, isLoading, error, refetch: fetchSummary };
}
