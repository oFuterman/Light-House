"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, LogEvent } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";

const levelColors: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warn: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
  debug: "bg-gray-100 text-gray-700",
};

// Placeholder data to show as an example of what logs will look like
const placeholderLogs: LogEvent[] = [
  {
    id: 1,
    org_id: 0,
    timestamp: new Date().toISOString(),
    level: "info",
    message: "Application started successfully",
    metadata: { version: "1.0.0", environment: "production" },
  },
  {
    id: 2,
    org_id: 0,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: "warn",
    message: "High memory usage detected",
    metadata: { usage_percent: 85 },
  },
  {
    id: 3,
    org_id: 0,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: "error",
    message: "Failed to connect to external service",
    metadata: { service: "payment-gateway", retry_count: 3 },
  },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await api.getLogs();
      setLogs(data);
      setFeatureUnavailable(false);
    } catch (err) {
      // Handle 501 Not Implemented, network errors, or any other failures gracefully
      console.error("Failed to load logs:", err);
      setFeatureUnavailable(true);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen">
        <nav className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex h-14 items-center gap-8">
              <Link href="/dashboard" className="font-semibold">
                Light House
              </Link>
              <div className="flex gap-4">
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Checks
                </Link>
                <Link href="/logs" className="text-sm text-gray-900 font-medium">
                  Logs
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-gray-600">Loading...</div>
        </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-14 items-center gap-8">
            <Link href="/dashboard" className="font-semibold">
              Light House
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Checks
              </Link>
              <Link href="/logs" className="text-sm text-gray-900 font-medium">
                Logs
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Logs</h1>

        {featureUnavailable ? (
          <>
            {/* Under Construction Banner */}
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-amber-500">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Log ingestion and search are under construction
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    This feature is coming soon. Below is a preview of what the log viewer will look like.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Placeholder logs with reduced opacity */}
            <div className="space-y-2 opacity-60">
              {placeholderLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        levelColors[log.level] || levelColors.info
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No logs yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Send logs to POST /api/v1/logs with your API key.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      levelColors[log.level] || levelColors.info
                    }`}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </div>
    </AuthGuard>
  );
}
