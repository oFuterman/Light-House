"use client";

import { useState, useEffect } from "react";
import { SearchRequest, FilterCondition } from "@/lib/api";

interface CheckResultsFilterBarProps {
  onChange: (request: SearchRequest) => void;
  isLoading?: boolean;
}

type TimeRangeOption = { label: string; hours: number };
type StatusOption = { label: string; value: string };
type LatencyOption = { label: string; value: string };

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
];

const STATUS_OPTIONS: StatusOption[] = [
  { label: "All", value: "all" },
  { label: "2xx", value: "2xx" },
  { label: "4xx", value: "4xx" },
  { label: "5xx", value: "5xx" },
  { label: "Errors", value: "errors" },
];

const LATENCY_OPTIONS: LatencyOption[] = [
  { label: "All", value: "all" },
  { label: "<200ms", value: "fast" },
  { label: "200-500ms", value: "medium" },
  { label: ">500ms", value: "slow" },
];

function buildSearchRequest(
  timeRangeHours: number,
  statusFilter: string,
  latencyFilter: string
): SearchRequest {
  const filters: FilterCondition[] = [];

  // Status code filters
  if (statusFilter === "2xx") {
    filters.push({ field: "status_code", op: "gte", value: 200 });
    filters.push({ field: "status_code", op: "lt", value: 300 });
  } else if (statusFilter === "4xx") {
    filters.push({ field: "status_code", op: "gte", value: 400 });
    filters.push({ field: "status_code", op: "lt", value: 500 });
  } else if (statusFilter === "5xx") {
    filters.push({ field: "status_code", op: "gte", value: 500 });
    filters.push({ field: "status_code", op: "lt", value: 600 });
  } else if (statusFilter === "errors") {
    filters.push({ field: "status_code", op: "gte", value: 400 });
  }

  // Latency filters
  if (latencyFilter === "fast") {
    filters.push({ field: "response_time_ms", op: "lt", value: 200 });
  } else if (latencyFilter === "medium") {
    filters.push({ field: "response_time_ms", op: "gte", value: 200 });
    filters.push({ field: "response_time_ms", op: "lte", value: 500 });
  } else if (latencyFilter === "slow") {
    filters.push({ field: "response_time_ms", op: "gt", value: 500 });
  }

  return {
    time_range: {
      from: new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
    },
    filters,
    sort: [{ field: "created_at", dir: "desc" }],
    limit: 200,
    offset: 0,
  };
}

export function CheckResultsFilterBar({ onChange, isLoading }: CheckResultsFilterBarProps) {
  const [timeRangeHours, setTimeRangeHours] = useState(24);
  const [statusFilter, setStatusFilter] = useState("all");
  const [latencyFilter, setLatencyFilter] = useState("all");

  // Emit search request on any filter change
  useEffect(() => {
    const request = buildSearchRequest(timeRangeHours, statusFilter, latencyFilter);
    onChange(request);
  }, [timeRangeHours, statusFilter, latencyFilter, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 border-b border-gray-200">
      {/* Time Range */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Time:</span>
        <div className="inline-flex rounded-md shadow-sm">
          {TIME_RANGE_OPTIONS.map((option, index) => (
            <button
              key={option.hours}
              type="button"
              onClick={() => setTimeRangeHours(option.hours)}
              disabled={isLoading}
              className={`
                px-3 py-1.5 text-xs font-medium border
                ${index === 0 ? "rounded-l-md" : ""}
                ${index === TIME_RANGE_OPTIONS.length - 1 ? "rounded-r-md" : ""}
                ${index !== 0 ? "-ml-px" : ""}
                focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  timeRangeHours === option.hours
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Status:</span>
        <div className="inline-flex rounded-md shadow-sm">
          {STATUS_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              disabled={isLoading}
              className={`
                px-3 py-1.5 text-xs font-medium border
                ${index === 0 ? "rounded-l-md" : ""}
                ${index === STATUS_OPTIONS.length - 1 ? "rounded-r-md" : ""}
                ${index !== 0 ? "-ml-px" : ""}
                focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  statusFilter === option.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Latency Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Latency:</span>
        <div className="inline-flex rounded-md shadow-sm">
          {LATENCY_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLatencyFilter(option.value)}
              disabled={isLoading}
              className={`
                px-3 py-1.5 text-xs font-medium border
                ${index === 0 ? "rounded-l-md" : ""}
                ${index === LATENCY_OPTIONS.length - 1 ? "rounded-r-md" : ""}
                ${index !== 0 ? "-ml-px" : ""}
                focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  latencyFilter === option.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
