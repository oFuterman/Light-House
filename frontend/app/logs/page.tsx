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

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs:", err);
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

        {logs.length === 0 ? (
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
