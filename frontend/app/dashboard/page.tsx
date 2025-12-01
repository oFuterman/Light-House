"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Check } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { AuthGuard } from "@/components/auth-guard";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <Link
          href="/checks/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
        >
          New Check
        </Link>
      </div>

      {checks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">No checks configured yet.</p>
          <Link
            href="/checks/new"
            className="text-gray-900 font-medium hover:underline"
          >
            Create your first check
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
                  Last Check
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Next Check
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checks.map((check) => (
                <tr key={check.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/checks/${check.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {check.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
                    {check.url}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={check.last_status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {check.last_checked_at
                      ? new Date(check.last_checked_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {check.last_checked_at
                      ? new Date(
                          new Date(check.last_checked_at).getTime() +
                            check.interval_seconds * 1000
                        ).toLocaleString()
                      : "Soon"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
