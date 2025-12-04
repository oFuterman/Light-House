"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { LogEntry } from "@/lib/api";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { LogsSearchBar } from "@/components/LogsSearchBar";
import { useLogsSearch } from "@/hooks/useLogsSearch";
import { LogFilter, filtersToSearchRequest, createFilter, isDuplicateFilter } from "@/lib/logs-filter";
import { TimeRange } from "@/components/TimeRangePicker";

// Level colors - left border style like Datadog
const levelBorderColors: Record<string, string> = {
  DEBUG: "border-l-gray-400",
  INFO: "border-l-blue-500",
  WARN: "border-l-yellow-500",
  ERROR: "border-l-red-500",
};

const levelTextColors: Record<string, string> = {
  DEBUG: "text-gray-500",
  INFO: "text-blue-600",
  WARN: "text-yellow-600",
  ERROR: "text-red-600",
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate().toString().padStart(2, "0");
  const time = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${month} ${day} ${time}.${ms}`;
}

interface LogRowProps {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onAddFilter: (key: string, value: string) => void;
  onSetTimeRange: (timestamp: string) => void;
}

// Clickable field value component
function ClickableValue({
  fieldKey,
  value,
  onAddFilter,
  className = "",
}: {
  fieldKey: string;
  value: string | undefined | null;
  onAddFilter: (key: string, value: string) => void;
  className?: string;
}) {
  if (!value || value === "-") {
    return <span className={className}>-</span>;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAddFilter(fieldKey, value);
      }}
      className={`${className} hover:bg-blue-100 hover:text-blue-700 px-1 -mx-1 rounded transition-colors cursor-pointer text-left`}
      title={`Filter by ${fieldKey}:${value}`}
    >
      {value}
    </button>
  );
}

function LogRow({ log, isExpanded, onToggle, onAddFilter, onSetTimeRange }: LogRowProps) {
  const level = (log.level || "INFO").toUpperCase();
  const borderColor = levelBorderColors[level] || levelBorderColors.INFO;
  const textColor = levelTextColors[level] || levelTextColors.INFO;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`
          border-l-2 ${borderColor} cursor-pointer text-xs
          ${isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}
        `}
      >
        <td className="py-1.5 px-3 whitespace-nowrap text-gray-500 font-mono">
          {formatTimestamp(log.timestamp)}
        </td>
        <td className="py-1.5 px-3 whitespace-nowrap">
          <span className={`font-medium ${textColor}`}>{level}</span>
        </td>
        <td className="py-1.5 px-3 whitespace-nowrap text-gray-700 max-w-[150px] truncate">
          {log.service_name || "-"}
        </td>
        <td className="py-1.5 px-3 text-gray-800 font-mono truncate max-w-[600px]">
          {log.message}
        </td>
      </tr>

      {/* Expanded details panel */}
      {isExpanded && (
        <tr className="bg-gray-50 border-l-2 border-l-blue-500">
          <td colSpan={4} className="p-0">
            <div className="p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Primary fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Timestamp:</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetTimeRange(log.timestamp);
                    }}
                    className="font-mono text-gray-900 hover:bg-blue-100 hover:text-blue-700 px-1 -mx-1 rounded transition-colors cursor-pointer text-left"
                    title="Search ±1 hour around this time"
                  >
                    {new Date(log.timestamp).toISOString()}
                  </button>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Level:</span>
                  <ClickableValue
                    fieldKey="level"
                    value={level}
                    onAddFilter={onAddFilter}
                    className={`font-medium ${textColor}`}
                  />
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Service:</span>
                  <ClickableValue
                    fieldKey="service_name"
                    value={log.service_name}
                    onAddFilter={onAddFilter}
                    className="text-gray-900"
                  />
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Environment:</span>
                  <ClickableValue
                    fieldKey="environment"
                    value={log.environment}
                    onAddFilter={onAddFilter}
                    className="text-gray-900"
                  />
                </div>
                {log.region && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Region:</span>
                    <ClickableValue
                      fieldKey="region"
                      value={log.region}
                      onAddFilter={onAddFilter}
                      className="text-gray-900"
                    />
                  </div>
                )}
                {log.trace_id && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Trace ID:</span>
                    <ClickableValue
                      fieldKey="trace_id"
                      value={log.trace_id}
                      onAddFilter={onAddFilter}
                      className="font-mono text-gray-900 text-xs"
                    />
                  </div>
                )}
                {log.span_id && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Span ID:</span>
                    <ClickableValue
                      fieldKey="span_id"
                      value={log.span_id}
                      onAddFilter={onAddFilter}
                      className="font-mono text-gray-900 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Message:</span>
                <p className="font-mono text-gray-900 text-sm whitespace-pre-wrap break-all bg-white p-2 rounded border border-gray-200 mt-1">
                  {log.message}
                </p>
              </div>

              {/* Tags */}
              {log.tags && Object.keys(log.tags).length > 0 && (
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Tags:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(log.tags).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddFilter(key, String(value));
                        }}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-mono hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                        title={`Filter by ${key}:${value}`}
                      >
                        <span className="text-gray-500">{key}:</span>
                        <span className="ml-1">{String(value)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Helper to create default time range (15 minutes ago)
function createDefaultTimeRange(): TimeRange {
  const now = new Date();
  const from = new Date(now.getTime() - 15 * 60 * 1000);
  return { from, to: now };
}

export function LogsContent() {
  const [filters, setFilters] = useState<LogFilter[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(createDefaultTimeRange);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const { data: logs, total, isLoading, isLoadingMore, error, search, refetch, loadMore, hasMore } = useLogsSearch();
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Auto-execute search when filters or time range change
  const executeSearch = useCallback(() => {
    const request = filtersToSearchRequest(filters, timeRange);
    search(request);
  }, [filters, timeRange, search]);

  // Run search when filters or time range change
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleFiltersChange = useCallback((newFilters: LogFilter[]) => {
    setFilters(newFilters);
  }, []);

  const handleTimeRangeChange = useCallback((newRange: TimeRange) => {
    setTimeRange(newRange);
  }, []);

  const toggleLogExpanded = useCallback((logId: number) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  }, []);

  // Add a filter when clicking on a field value
  const handleAddFilter = useCallback((key: string, value: string) => {
    // Don't add duplicate filters
    if (isDuplicateFilter(filters, key, value)) {
      return;
    }
    const newFilter = createFilter(key, value);
    setFilters((prev) => [...prev, newFilter]);
  }, [filters]);

  // Set time range to ±1 hour around a timestamp
  const handleSetTimeRangeFromTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const oneHourMs = 60 * 60 * 1000;
    const from = new Date(date.getTime() - oneHourMs);
    const to = new Date(date.getTime() + oneHourMs);
    setTimeRange({ from, to });
  }, []);

  // Infinite scroll: use IntersectionObserver to detect when we scroll near the bottom
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Log Explorer</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {total.toLocaleString()} results found
            </span>
            <button
              onClick={refetch}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <LogsSearchBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          isLoading={isLoading}
        />
      </div>

      {/* Results count */}
      {logs.length > 0 && (
        <div className="flex-shrink-0 text-xs text-gray-500 mb-2">
          Showing {logs.length} of {total.toLocaleString()}
        </div>
      )}

      {/* Content */}
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
        <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-xs text-gray-600 uppercase tracking-wide">
                <th className="py-2 px-3 font-medium w-[180px]">Date</th>
                <th className="py-2 px-3 font-medium w-[70px]">Level</th>
                <th className="py-2 px-3 font-medium w-[150px]">Service</th>
                <th className="py-2 px-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogId === log.id}
                  onToggle={() => toggleLogExpanded(log.id)}
                  onAddFilter={handleAddFilter}
                  onSetTimeRange={handleSetTimeRangeFromTimestamp}
                />
              ))}
            </tbody>
          </table>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreTriggerRef} className="h-1" />

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-xs">Loading more...</span>
              </div>
            </div>
          )}

          {/* End of results indicator */}
          {!hasMore && logs.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-400 border-t border-gray-100">
              End of results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
