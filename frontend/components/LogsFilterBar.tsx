"use client";

import { useState } from "react";
import { SearchRequest, FilterCondition, TagFilter } from "@/lib/api";

interface LogsFilterBarProps {
  onSearch: (request: SearchRequest) => void;
  isLoading?: boolean;
}

const LOG_LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"];

const TIME_RANGE_OPTIONS = [
  { label: "Last hour", hours: 1 },
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 168 },
];

export function LogsFilterBar({ onSearch, isLoading }: LogsFilterBarProps) {
  const [timeRangeHours, setTimeRangeHours] = useState(24);
  const [level, setLevel] = useState<string>("");
  const [serviceName, setServiceName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [searchText, setSearchText] = useState("");
  const [tagKey, setTagKey] = useState("");
  const [tagValue, setTagValue] = useState("");

  const handleSearch = () => {
    const filters: FilterCondition[] = [];
    const tags: TagFilter[] = [];

    if (level) {
      filters.push({ field: "level", op: "eq", value: level });
    }
    const trimmedService = serviceName.trim();
    if (trimmedService) {
      filters.push({ field: "service_name", op: "eq", value: trimmedService });
    }
    const trimmedEnv = environment.trim();
    if (trimmedEnv) {
      filters.push({ field: "environment", op: "eq", value: trimmedEnv });
    }
    const trimmedSearch = searchText.trim();
    if (trimmedSearch) {
      filters.push({ field: "message", op: "contains", value: trimmedSearch });
    }
    const trimmedTagKey = tagKey.trim();
    const trimmedTagValue = tagValue.trim();
    if (trimmedTagKey && trimmedTagValue) {
      tags.push({ key: trimmedTagKey, op: "eq", value: trimmedTagValue });
    }

    const request: SearchRequest = {
      time_range: {
        from: new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
      },
      filters,
      tags,
      sort: [{ field: "timestamp", dir: "desc" }],
      limit: 100,
      offset: 0,
    };

    onSearch(request);
  };

  const handleClear = () => {
    setTimeRangeHours(24);
    setLevel("");
    setServiceName("");
    setEnvironment("");
    setSearchText("");
    setTagKey("");
    setTagValue("");

    onSearch({
      time_range: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      filters: [],
      tags: [],
      sort: [{ field: "timestamp", dir: "desc" }],
      limit: 100,
      offset: 0,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Time Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {TIME_RANGE_OPTIONS.map((option, index) => (
            <button
              key={option.hours}
              type="button"
              onClick={() => setTimeRangeHours(option.hours)}
              disabled={isLoading}
              className={`
                px-4 py-2 text-sm font-medium border
                ${index === 0 ? "rounded-l-md" : ""}
                ${index === TIME_RANGE_OPTIONS.length - 1 ? "rounded-r-md" : ""}
                ${index !== 0 ? "-ml-px" : ""}
                focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  timeRangeHours === option.hours
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">All levels</option>
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Service */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g., api-gateway"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Environment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
          <input
            type="text"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="e.g., production"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Message Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search in message..."
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Tag Filter */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tag Key</label>
          <input
            type="text"
            value={tagKey}
            onChange={(e) => setTagKey(e.target.value)}
            placeholder="e.g., user_id"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tag Value</label>
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            placeholder="e.g., 12345"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
        <button
          onClick={handleClear}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
