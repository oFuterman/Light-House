"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseAutoRefreshOptions {
  callback: () => void | Promise<void>;
  intervalMs?: number;
  enabled?: boolean;
  pauseOnHidden?: boolean;
}

interface UseAutoRefreshReturn {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  refresh: () => void;
}

export function useAutoRefresh({
  callback,
  intervalMs = 30000,
  enabled = true,
  pauseOnHidden = true,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [isEnabled, setEnabled] = useState(enabled);
  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const refresh = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      if (pauseOnHidden && document.hidden) return;
      callbackRef.current();
    }, intervalMs);

    // Refresh immediately when tab becomes visible
    const handleVisibility = () => {
      if (!document.hidden) {
        callbackRef.current();
      }
    };

    if (pauseOnHidden) {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (pauseOnHidden) {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [intervalMs, isEnabled, pauseOnHidden]);

  return { isEnabled, setEnabled, refresh };
}
