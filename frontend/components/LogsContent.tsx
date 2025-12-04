"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { LogEntry } from "@/lib/api";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { LogsSearchBar } from "@/components/LogsSearchBar";
import { useLogsSearch } from "@/hooks/useLogsSearch";
import { LogFilter, filtersToSearchRequest, createFilter, isDuplicateFilter, SortConfig } from "@/lib/logs-filter";
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

// Custom column definition
interface CustomColumn {
  key: string;
  label: string;
  addedAt: number; // timestamp for ordering
}

// Context menu for field actions
interface FieldContextMenuProps {
  x: number;
  y: number;
  fieldKey: string;
  fieldValue: string;
  onSearch: () => void;
  onAddToTable: () => void;
  onClose: () => void;
  isTimestamp?: boolean;
  canAddToTable?: boolean;
}

function FieldContextMenu({ x, y, fieldKey, fieldValue, onSearch, onAddToTable, onClose, isTimestamp, canAddToTable = true }: FieldContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Adjust position if menu would go off-screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 100);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <button
        onClick={() => {
          onSearch();
          onClose();
        }}
        className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isTimestamp ? "Search ±1 hour" : `Search ${fieldKey}`}
      </button>
      {!isTimestamp && canAddToTable && (
        <button
          onClick={() => {
            onAddToTable();
            onClose();
          }}
          className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add to table
        </button>
      )}
    </div>
  );
}

interface LogRowProps {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onFieldClick: (e: React.MouseEvent, fieldKey: string, fieldValue: string, isTimestamp?: boolean) => void;
  customColumns: CustomColumn[];
}

// Get field value from log entry (supports nested tags)
function getFieldValue(log: LogEntry, fieldKey: string): string {
  switch (fieldKey) {
    case "level":
      return (log.level || "").toUpperCase();
    case "service_name":
      return log.service_name || "-";
    case "environment":
      return log.environment || "-";
    case "region":
      return log.region || "-";
    case "trace_id":
      return log.trace_id || "-";
    case "span_id":
      return log.span_id || "-";
    case "message":
      return log.message || "-";
    default:
      // Check in tags
      if (log.tags && fieldKey in log.tags) {
        return String(log.tags[fieldKey]);
      }
      return "-";
  }
}

// Clickable field value component
function ClickableValue({
  fieldKey,
  value,
  onFieldClick,
  className = "",
  isTimestamp = false,
}: {
  fieldKey: string;
  value: string | undefined | null;
  onFieldClick: (e: React.MouseEvent, fieldKey: string, fieldValue: string, isTimestamp?: boolean) => void;
  className?: string;
  isTimestamp?: boolean;
}) {
  if (!value || value === "-") {
    return <span className={className}>-</span>;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onFieldClick(e, fieldKey, value, isTimestamp);
      }}
      className={`${className} hover:bg-blue-100 hover:text-blue-700 px-1 -mx-1 rounded transition-colors cursor-pointer text-left`}
      title={isTimestamp ? "Click for options" : `Click for options on ${fieldKey}:${value}`}
    >
      {value}
    </button>
  );
}

function LogRow({ log, isExpanded, onToggle, onFieldClick, customColumns }: LogRowProps) {
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
        <td className="py-1.5 px-3 whitespace-nowrap text-gray-600 max-w-[120px] truncate">
          {log.environment || "-"}
        </td>
        {/* Custom columns */}
        {customColumns.map((col) => (
          <td key={col.key} className="py-1.5 px-3 whitespace-nowrap text-gray-700 max-w-[150px] truncate">
            {getFieldValue(log, col.key)}
          </td>
        ))}
        <td className="py-1.5 px-3 text-gray-800 font-mono truncate max-w-[600px]">
          {log.message}
        </td>
      </tr>

      {/* Expanded details panel */}
      {isExpanded && (
        <tr className="bg-gray-50 border-l-2 border-l-blue-500">
          <td colSpan={5 + customColumns.length} className="p-0">
            <div className="p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Primary fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Timestamp:</span>
                  <ClickableValue
                    fieldKey="timestamp"
                    value={new Date(log.timestamp).toISOString()}
                    onFieldClick={(e) => onFieldClick(e, "timestamp", log.timestamp, true)}
                    className="font-mono text-gray-900"
                    isTimestamp
                  />
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Level:</span>
                  <ClickableValue
                    fieldKey="level"
                    value={level}
                    onFieldClick={onFieldClick}
                    className={`font-medium ${textColor}`}
                  />
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Service:</span>
                  <ClickableValue
                    fieldKey="service_name"
                    value={log.service_name}
                    onFieldClick={onFieldClick}
                    className="text-gray-900"
                  />
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Environment:</span>
                  <ClickableValue
                    fieldKey="environment"
                    value={log.environment}
                    onFieldClick={onFieldClick}
                    className="text-gray-900"
                  />
                </div>
                {log.region && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Region:</span>
                    <ClickableValue
                      fieldKey="region"
                      value={log.region}
                      onFieldClick={onFieldClick}
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
                      onFieldClick={onFieldClick}
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
                      onFieldClick={onFieldClick}
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
                          onFieldClick(e, key, String(value));
                        }}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-mono hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                        title={`Click for options on ${key}:${value}`}
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

// Format field key for display
function formatFieldLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Sort indicator component
function SortIndicator({ field, currentSort }: { field: string; currentSort: SortConfig }) {
  if (currentSort.field !== field) {
    // Show subtle indicator for sortable but not active
    return (
      <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  // Show active sort direction
  if (currentSort.dir === "asc") {
    return (
      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }

  return (
    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function LogsContent() {
  const [filters, setFilters] = useState<LogFilter[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(createDefaultTimeRange);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "timestamp", dir: "desc" });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fieldKey: string;
    fieldValue: string;
    isTimestamp: boolean;
  } | null>(null);

  const { data: logs, total, isLoading, isLoadingMore, error, search, refetch, loadMore, hasMore } = useLogsSearch();
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Auto-execute search when filters, time range, or sort changes
  const executeSearch = useCallback(() => {
    const request = filtersToSearchRequest(filters, timeRange, sortConfig);
    search(request);
  }, [filters, timeRange, sortConfig, search]);

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

  // Handle field click - show context menu
  const handleFieldClick = useCallback((e: React.MouseEvent, fieldKey: string, fieldValue: string, isTimestamp = false) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fieldKey,
      fieldValue,
      isTimestamp,
    });
  }, []);

  // Add a filter when searching on a field
  const handleSearchField = useCallback(() => {
    if (!contextMenu) return;

    const { fieldKey, fieldValue, isTimestamp } = contextMenu;

    if (isTimestamp) {
      // Set time range to ±1 hour around the timestamp
      const date = new Date(fieldValue);
      const oneHourMs = 60 * 60 * 1000;
      const from = new Date(date.getTime() - oneHourMs);
      const to = new Date(date.getTime() + oneHourMs);
      setTimeRange({ from, to });
    } else {
      // Add filter
      if (!isDuplicateFilter(filters, fieldKey, fieldValue)) {
        const newFilter = createFilter(fieldKey, fieldValue);
        setFilters((prev) => [...prev, newFilter]);
      }
    }
  }, [contextMenu, filters]);

  // Fields that are already in the default table columns
  const DEFAULT_COLUMNS = ["timestamp", "level", "service_name", "environment", "message"];

  // Add field to table as custom column
  const handleAddToTable = useCallback(() => {
    if (!contextMenu) return;

    const { fieldKey } = contextMenu;

    // Check if it's a default column (can't be added)
    if (DEFAULT_COLUMNS.includes(fieldKey)) {
      return;
    }

    // Check if column already exists
    if (customColumns.some((col) => col.key === fieldKey)) {
      return;
    }

    const newColumn: CustomColumn = {
      key: fieldKey,
      label: formatFieldLabel(fieldKey),
      addedAt: Date.now(),
    };

    setCustomColumns((prev) => {
      // If we already have 2 columns, remove the oldest one
      if (prev.length >= 2) {
        const sorted = [...prev].sort((a, b) => a.addedAt - b.addedAt);
        return [...sorted.slice(1), newColumn];
      }
      return [...prev, newColumn];
    });
  }, [contextMenu, customColumns]);

  // Remove custom column
  const handleRemoveColumn = useCallback((key: string) => {
    setCustomColumns((prev) => prev.filter((col) => col.key !== key));
  }, []);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle column header click for sorting
  const handleSort = useCallback((field: string) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        // Toggle direction if same field
        return { field, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // New field, default to descending (most recent first for most fields)
      return { field, dir: "desc" };
    });
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
      {/* Context Menu */}
      {contextMenu && (
        <FieldContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          fieldKey={contextMenu.fieldKey}
          fieldValue={contextMenu.fieldValue}
          onSearch={handleSearchField}
          onAddToTable={handleAddToTable}
          onClose={handleCloseContextMenu}
          isTimestamp={contextMenu.isTimestamp}
          canAddToTable={!DEFAULT_COLUMNS.includes(contextMenu.fieldKey) && !customColumns.some((col) => col.key === contextMenu.fieldKey)}
        />
      )}

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
                <th className="py-2 px-3 font-medium w-[180px]">
                  <button
                    onClick={() => handleSort("timestamp")}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    <span>Date</span>
                    <SortIndicator field="timestamp" currentSort={sortConfig} />
                  </button>
                </th>
                <th className="py-2 px-3 font-medium w-[70px]">
                  <button
                    onClick={() => handleSort("level")}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    <span>Level</span>
                    <SortIndicator field="level" currentSort={sortConfig} />
                  </button>
                </th>
                <th className="py-2 px-3 font-medium w-[150px]">
                  <button
                    onClick={() => handleSort("service_name")}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    <span>Service</span>
                    <SortIndicator field="service_name" currentSort={sortConfig} />
                  </button>
                </th>
                <th className="py-2 px-3 font-medium w-[120px]">
                  <button
                    onClick={() => handleSort("environment")}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    <span>Env</span>
                    <SortIndicator field="environment" currentSort={sortConfig} />
                  </button>
                </th>
                {/* Custom columns */}
                {customColumns.map((col) => (
                  <th key={col.key} className="py-2 px-3 font-medium w-[150px]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        <span>{col.label}</span>
                        <SortIndicator field={col.key} currentSort={sortConfig} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveColumn(col.key);
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-red-500"
                        title={`Remove ${col.label} column`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </th>
                ))}
                <th className="py-2 px-3 font-medium">
                  <button
                    onClick={() => handleSort("message")}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    <span>Message</span>
                    <SortIndicator field="message" currentSort={sortConfig} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogId === log.id}
                  onToggle={() => toggleLogExpanded(log.id)}
                  onFieldClick={handleFieldClick}
                  customColumns={customColumns}
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
