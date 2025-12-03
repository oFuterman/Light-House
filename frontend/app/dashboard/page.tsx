"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, Check } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { CheckTableRow } from "@/components/CheckTableRow";
import { AutoRefreshToggle } from "@/components/AutoRefreshToggle";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

export default function DashboardPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    loadChecks();
  }, []);

  const loadChecks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getChecks();
      setChecks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load checks:", err);
      setError("Unable to load your checks. Please check your connection and try again.");
      setChecks([]);
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh for auto-refresh (no loading state)
  const silentRefresh = useCallback(async () => {
    try {
      const data = await api.getChecks();
      setChecks(Array.isArray(data) ? data : []);
      setRefreshCount((c) => c + 1);
    } catch (err) {
      console.error("Auto-refresh failed:", err);
    }
  }, []);

  const { isEnabled: autoRefreshEnabled, setEnabled: setAutoRefreshEnabled } = useAutoRefresh({
    callback: silentRefresh,
    intervalMs: 30000,
  });

  if (loading) {
    return (
      <AuthGuard>
        <Loading message="Loading checks..." />
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <ErrorState
          title="Failed to load checks"
          message={error}
          onRetry={loadChecks}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Uptime Checks</h1>
        <div className="flex items-center gap-2">
          <AutoRefreshToggle
            isEnabled={autoRefreshEnabled}
            onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            intervalSeconds={30}
          />
          <Link
            href="/settings"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Settings
          </Link>
          <Link
            href="/checks/new"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
          >
            New Check
          </Link>
        </div>
      </div>

      {checks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
            <svg
              className="w-7 h-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No checks yet</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
            Get started by creating your first uptime check. Light House will monitor your endpoints and record results automatically.
          </p>
          <Link
            href="/checks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Your First Check
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  URL
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Uptime (24h)
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Last Check
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Next Check
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checks.map((check) => (
                <CheckTableRow key={check.id} check={check} refreshTrigger={refreshCount} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
