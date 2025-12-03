"use client";

import { useState, useEffect } from "react";
import { api, Alert } from "@/lib/api";

interface UseCheckAlertsOptions {
  checkId: string | number;
  windowHours?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseCheckAlertsReturn {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCheckAlerts({
  checkId,
  windowHours = 24,
  limit = 50,
  enabled = true,
}: UseCheckAlertsOptions): UseCheckAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    if (!enabled || !checkId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCheckAlerts(checkId, { windowHours, limit });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [checkId, windowHours, limit, enabled]);

  return { alerts, isLoading, error, refetch: fetchAlerts };
}
