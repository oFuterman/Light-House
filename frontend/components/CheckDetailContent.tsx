"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Check, CheckResult } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { LazyChart } from "@/components/LazyChart";
import { AlertsTab } from "@/components/AlertsTab";
import { CheckResultsTab } from "@/components/CheckResultsTab";
import { ClientDate } from "@/components/ClientDate";

type Tab = "results" | "alerts";

interface CheckDetailContentProps {
  check: Check;
  initialResults: CheckResult[];
}

export function CheckDetailContent({ check, initialResults }: CheckDetailContentProps) {
  const [results, setResults] = useState<CheckResult[]>(initialResults);
  const [windowHours, setWindowHours] = useState(24);
  const [chartLoading, setChartLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("results");

  // Refetch results when time range changes
  useEffect(() => {
    if (windowHours !== 24) {
      loadResults();
    }
  }, [windowHours]);

  const loadResults = async () => {
    setChartLoading(true);
    try {
      const resultsData = await api.getCheckResults(String(check.id), { windowHours });
      setResults(Array.isArray(resultsData) ? resultsData : []);
    } catch (err) {
      console.error("Failed to load results:", err);
    } finally {
      setChartLoading(false);
    }
  };

  return (
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
              <ClientDate date={check.last_checked_at} fallback="Never" />
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
          <LazyChart results={results} />
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
        {activeTab === "results" && <CheckResultsTab checkId={String(check.id)} />}
        {activeTab === "alerts" && <AlertsTab checkId={String(check.id)} windowHours={windowHours} />}
      </div>
    </div>
  );
}
