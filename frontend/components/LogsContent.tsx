"use client";

import Link from "next/link";
import { LogEntry, SearchRequest } from "@/lib/api";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { LogsFilterBar } from "@/components/LogsFilterBar";
import { useLogsSearch } from "@/hooks/useLogsSearch";

const levelColors: Record<string, string> = {
  DEBUG: "bg-gray-100 text-gray-700",
  INFO: "bg-blue-100 text-blue-700",
  WARN: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
};

function LogEntryRow({ log }: { log: LogEntry }) {
  const level = (log.level || "INFO").toUpperCase();
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            levelColors[level] || levelColors.INFO
          }`}
        >
          {level}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-mono">{log.message}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
            <span>{new Date(log.timestamp).toLocaleString()}</span>
            {log.service_name && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">Service:</span> {log.service_name}
              </span>
            )}
            {log.environment && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">Env:</span> {log.environment}
              </span>
            )}
            {log.trace_id && log.trace_id.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">Trace:</span>
                <code className="bg-gray-100 px-1 rounded">
                  {log.trace_id.length > 8 ? `${log.trace_id.slice(0, 8)}...` : log.trace_id}
                </code>
              </span>
            )}
          </div>
          {log.tags && Object.keys(log.tags).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(log.tags).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LogsContent() {
  const { data: logs, total, isLoading, error, search, refetch } = useLogsSearch();

  const handleSearch = (request: SearchRequest) => {
    search(request);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Logs</h1>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {logs.length} of {total} logs
            </p>
          )}
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-6">
        <LogsFilterBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {isLoading ? (
        <Loading message="Searching logs..." />
      ) : error ? (
        <ErrorState
          title="Failed to search logs"
          message={error}
          onRetry={refetch}
        />
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No logs found</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto">
            No logs match your search criteria. Try adjusting your filters or time range.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogEntryRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
