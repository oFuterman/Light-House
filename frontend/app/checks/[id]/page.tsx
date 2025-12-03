"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Check, CheckResult } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { AuthGuard } from "@/components/auth-guard";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { CheckResponseTimeChart } from "@/components/CheckResponseTimeChart";
import { AlertsTab } from "@/components/AlertsTab";

type Tab = "results" | "alerts";

export default function CheckDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [check, setCheck] = useState<Check | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState(24);
  const [chartLoading, setChartLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("results");

  useEffect(() => {
    loadData();
  }, [id]);

  // Refetch results when time range changes
  useEffect(() => {
    if (check) {
      loadResults();
    }
  }, [windowHours]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [checkData, resultsData] = await Promise.all([
        api.getCheck(id),
        api.getCheckResults(id, { windowHours }),
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

  const loadResults = async () => {
    setChartLoading(true);
    try {
      const resultsData = await api.getCheckResults(id, { windowHours });
      setResults(Array.isArray(resultsData) ? resultsData : []);
    } catch (err) {
      console.error("Failed to load results:", err);
    } finally {
      setChartLoading(false);
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

      {/* Response Time Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Response Time</h2>
          <TimeRangeSelector
            value={windowHours}
            onChange={setWindowHours}
            disabled={chartLoading}
          />
        </div>
        <div className="relative">
          {chartLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded">
              <div className="flex items-center gap-2 text-gray-500">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Loading...</span>
              </div>
            </div>
          )}
          <CheckResponseTimeChart results={results} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "results"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === "alerts"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Alerts
            </button>
          </nav>
        </div>
        {activeTab === "results" && (
          <>
            {results.length === 0 ? (
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">No results yet</p>
                    <p className="text-sm text-gray-600 mt-1">
                      The worker will run this check soon. Results will appear here once the first check completes.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Response Time</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(result.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={result.status_code} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{result.response_time_ms ?? "-"}ms</td>
                      <td className="px-4 py-3 text-sm text-red-600">{result.error_message || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        {activeTab === "alerts" && <AlertsTab checkId={id} windowHours={windowHours} />}
      </div>
      </div>
    </AuthGuard>
  );
}
