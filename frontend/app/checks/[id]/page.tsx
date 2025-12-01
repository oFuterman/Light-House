"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Check, CheckResult } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { AuthGuard } from "@/components/auth-guard";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";

export default function CheckDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [check, setCheck] = useState<Check | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [checkData, resultsData] = await Promise.all([
        api.getCheck(id),
        api.getCheckResults(id),
      ]);
      setCheck(checkData);
      setResults(Array.isArray(resultsData) ? resultsData : []);
    } catch (err) {
      console.error("Failed to load check:", err);
      setError("Unable to load check details. The check may not exist or there was a connection issue.");
      setCheck(null);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Loading message="Loading check details..." />
      </AuthGuard>
    );
  }

  if (error || !check) {
    return (
      <AuthGuard>
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <ErrorState
          title="Check not found"
          message={error || "This check doesn't exist or you don't have access to it."}
          onRetry={loadData}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{check.name}</h1>
            <p className="text-gray-600 text-sm">{check.url}</p>
          </div>
          <StatusBadge status={check.last_status} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Interval:</span>{" "}
            <span className="font-medium">{check.interval_seconds}s</span>
          </div>
          <div>
            <span className="text-gray-600">Last checked:</span>{" "}
            <span className="font-medium">
              {check.last_checked_at
                ? new Date(check.last_checked_at).toLocaleString()
                : "Never"}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>{" "}
            <span className="font-medium">
              {check.is_active ? "Active" : "Paused"}
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Recent Results</h2>

      {results.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No results yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Response Time
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(result.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={result.status_code} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {result.response_time_ms ?? '-'}ms
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600">
                    {result.error_message || "-"}
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
