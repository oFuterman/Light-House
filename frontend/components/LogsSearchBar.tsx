"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { api, LogFacetsResponse } from "@/lib/api";
import { LogFilter, createFilter, isDuplicateFilter, filterToString } from "@/lib/logs-filter";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { FilterChip } from "./FilterChip";
import { TimeRangePicker, TimeRange } from "./TimeRangePicker";

// Define filter key type
interface FilterKeyDef {
  key: string;
  label: string;
  description: string;
  type: "field" | "tag";
}

// Define core filter keys with display names
const CORE_FILTER_KEYS: FilterKeyDef[] = [
  { key: "level", label: "level", description: "Log level", type: "field" },
  { key: "service_name", label: "service", description: "Service name", type: "field" },
  { key: "environment", label: "environment", description: "Environment", type: "field" },
  { key: "region", label: "region", description: "Region", type: "field" },
  { key: "message", label: "message", description: "Message content", type: "field" },
  { key: "trace_id", label: "trace_id", description: "Trace ID", type: "field" },
];

interface LogsSearchBarProps {
  filters: LogFilter[];
  onFiltersChange: (filters: LogFilter[]) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  isLoading?: boolean;
}

type InputMode = "idle" | "key" | "value";

export function LogsSearchBar({
  filters,
  onFiltersChange,
  timeRange,
  onTimeRangeChange,
  isLoading,
}: LogsSearchBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedKeyLabel, setSelectedKeyLabel] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [facets, setFacets] = useState<LogFacetsResponse | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { searches, addSearch } = useRecentSearches();

  // Fetch facets on mount
  useEffect(() => {
    const fetchFacets = async () => {
      setFacetsLoading(true);
      try {
        const data = await api.getLogFacets();
        setFacets(data);
      } catch (error) {
        console.error("Failed to fetch facets:", error);
      } finally {
        setFacetsLoading(false);
      }
    };
    fetchFacets();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // If we had a key selected but no value, reset
        if (inputMode === "value" && !inputValue) {
          setInputMode("idle");
          setSelectedKey(null);
          setSelectedKeyLabel(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputMode, inputValue]);

  // Get values for currently selected key
  const getValuesForKey = useCallback(
    (key: string): string[] => {
      if (!facets) return [];
      switch (key) {
        case "level":
          return facets.levels || [];
        case "service_name":
          return facets.services || [];
        case "environment":
          return facets.environments || [];
        case "region":
          return facets.regions || [];
        default:
          // Check if it's a tag key
          if (facets.tag_values && facets.tag_values[key]) {
            return facets.tag_values[key];
          }
          return [];
      }
    },
    [facets]
  );

  // Build complete list of filter keys (core + tags)
  const getAllFilterKeys = useCallback((): FilterKeyDef[] => {
    const allKeys: FilterKeyDef[] = [...CORE_FILTER_KEYS];

    // Add tag keys from facets
    if (facets?.tag_keys) {
      for (const tagKey of facets.tag_keys) {
        // Avoid duplicates with core keys
        if (!allKeys.some(k => k.key === tagKey)) {
          allKeys.push({
            key: tagKey,
            label: tagKey,
            description: "Tag",
            type: "tag",
          });
        }
      }
    }

    return allKeys;
  }, [facets]);

  // Get dropdown items based on current mode
  const getDropdownItems = useCallback(() => {
    if (inputMode === "value" && selectedKey) {
      // Show values for selected key
      const values = getValuesForKey(selectedKey);
      const searchTerm = inputValue.toLowerCase();
      const matchedValues = values
        .filter((v) => v.toLowerCase().includes(searchTerm))
        .map((v) => ({
          type: "value" as const,
          label: v,
          value: v,
        }));

      // If user typed something and it doesn't exactly match a value, show custom value option
      if (inputValue.trim() && !values.some(v => v.toLowerCase() === inputValue.toLowerCase())) {
        matchedValues.unshift({
          type: "value" as const,
          label: `Use "${inputValue}"`,
          value: inputValue.trim(),
        });
      }

      return matchedValues;
    }

    // Show keys (and recent searches if no input)
    const items: { type: "recent" | "key" | "custom"; label: string; description?: string; value: string }[] = [];

    // Add recent searches if no input
    if (!inputValue && searches.length > 0) {
      for (const recent of searches.slice(0, 5)) {
        items.push({
          type: "recent",
          label: recent.query,
          description: "Recent",
          value: recent.query,
        });
      }
    }

    // Add filter keys (both core and tag keys)
    const searchTerm = inputValue.toLowerCase();
    const allFilterKeys = getAllFilterKeys();
    let hasExactMatch = false;

    for (const filterKey of allFilterKeys) {
      const matches = filterKey.label.toLowerCase().includes(searchTerm) ||
        filterKey.key.toLowerCase().includes(searchTerm);

      if (matches) {
        if (filterKey.key.toLowerCase() === searchTerm || filterKey.label.toLowerCase() === searchTerm) {
          hasExactMatch = true;
        }
        items.push({
          type: "key",
          label: filterKey.label,
          description: filterKey.description,
          value: filterKey.key,
        });
      }
    }

    // If user typed something that doesn't match any key, show option to use as custom key
    if (inputValue.trim() && !hasExactMatch) {
      items.push({
        type: "custom",
        label: `Use custom key "${inputValue}"`,
        description: "Custom filter",
        value: inputValue.trim(),
      });
    }

    return items;
  }, [inputMode, inputValue, selectedKey, getValuesForKey, searches, getAllFilterKeys]);

  const dropdownItems = getDropdownItems();

  // Reset highlighted index when dropdown items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [dropdownItems.length, inputMode]);

  const handleSelectKey = useCallback((key: string, label: string) => {
    setSelectedKey(key);
    setSelectedKeyLabel(label);
    setInputMode("value");
    setInputValue("");
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }, []);

  const handleAddFilter = useCallback(
    (key: string, value: string, label?: string) => {
      if (!value.trim()) return;

      if (isDuplicateFilter(filters, key, value)) {
        // Reset state without adding duplicate
        setInputValue("");
        setInputMode("idle");
        setSelectedKey(null);
        setSelectedKeyLabel(null);
        setIsDropdownOpen(false);
        return;
      }

      const newFilter = createFilter(key, value);
      onFiltersChange([...filters, newFilter]);

      // Add to recent searches
      addSearch(filterToString(newFilter));

      // Reset state
      setInputValue("");
      setInputMode("idle");
      setSelectedKey(null);
      setSelectedKeyLabel(null);
      setIsDropdownOpen(false);
    },
    [filters, onFiltersChange, addSearch]
  );

  const handleSelectValue = useCallback(
    (value: string) => {
      if (selectedKey) {
        handleAddFilter(selectedKey, value, selectedKeyLabel || undefined);
      }
    },
    [selectedKey, selectedKeyLabel, handleAddFilter]
  );

  const handleSelectRecent = useCallback(
    (recentQuery: string) => {
      // Parse recent query (format: "key:value")
      const colonIndex = recentQuery.indexOf(":");
      if (colonIndex === -1) return;

      const key = recentQuery.slice(0, colonIndex).trim();
      const value = recentQuery.slice(colonIndex + 1).trim();

      // Find the actual key (might be label -> key conversion needed)
      const allFilterKeys = getAllFilterKeys();
      const filterKey = allFilterKeys.find((f) => f.label === key || f.key === key);
      const actualKey = filterKey?.key || key;

      handleAddFilter(actualKey, value);
    },
    [handleAddFilter, getAllFilterKeys]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
    if (inputMode === "idle") {
      setInputMode("key");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsDropdownOpen(false);
      if (inputMode === "value") {
        setInputMode("key");
        setSelectedKey(null);
        setSelectedKeyLabel(null);
      }
      setInputValue("");
      return;
    }

    if (e.key === "Backspace" && inputValue === "") {
      if (inputMode === "value" && selectedKey) {
        // Go back to key selection
        setInputMode("key");
        setSelectedKey(null);
        setSelectedKeyLabel(null);
        return;
      }
      // Remove last filter
      if (filters.length > 0) {
        const newFilters = filters.slice(0, -1);
        onFiltersChange(newFilters);
      }
      return;
    }

    if (!isDropdownOpen || dropdownItems.length === 0) {
      if (e.key === "Enter" && inputMode === "value" && selectedKey && inputValue.trim()) {
        e.preventDefault();
        handleAddFilter(selectedKey, inputValue.trim(), selectedKeyLabel || undefined);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < dropdownItems.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : dropdownItems.length - 1));
      return;
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const item = dropdownItems[highlightedIndex];
      if (!item) {
        // If in value mode with custom input, add the filter
        if (inputMode === "value" && selectedKey && inputValue.trim()) {
          handleAddFilter(selectedKey, inputValue.trim(), selectedKeyLabel || undefined);
        }
        // If in key mode with custom input, transition to value mode with that key
        if (inputMode === "key" && inputValue.trim()) {
          handleSelectKey(inputValue.trim(), inputValue.trim());
        }
        return;
      }

      if (item.type === "key") {
        handleSelectKey(item.value, item.label);
      } else if (item.type === "custom") {
        // Custom key - use the input value as both key and label
        handleSelectKey(item.value, item.value);
      } else if (item.type === "value") {
        handleSelectValue(item.value);
      } else if (item.type === "recent") {
        handleSelectRecent(item.value);
      }
    }
  };

  const handleDropdownItemClick = (item: (typeof dropdownItems)[0]) => {
    if (item.type === "key") {
      handleSelectKey(item.value, item.label);
    } else if (item.type === "custom") {
      // Custom key - use the value as both key and label
      handleSelectKey(item.value, item.value);
    } else if (item.type === "value") {
      handleSelectValue(item.value);
    } else if (item.type === "recent") {
      handleSelectRecent(item.value);
    }
  };

  const removeFilter = useCallback(
    (filterId: string) => {
      onFiltersChange(filters.filter((f) => f.id !== filterId));
    },
    [filters, onFiltersChange]
  );

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Time Range - visible on small screens only */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between">
          <TimeRangePicker
            value={timeRange}
            onChange={onTimeRangeChange}
            disabled={isLoading}
          />
          {facetsLoading && (
            <span className="text-xs text-gray-400">Loading filters...</span>
          )}
        </div>
      </div>

      {/* Search Bar + Time Range (inline on large screens) */}
      <div className="flex gap-3 items-start">
        {/* Search Bar */}
        <div ref={containerRef} className="relative flex-1 lg:flex-[3]">
        <div
          className={`
            flex items-center border rounded-md transition-all
            ${isDropdownOpen ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-300"}
          `}
        >
          {/* Search Icon */}
          <div className="pl-3 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Selected Key Tag (shown when in value mode) */}
          {inputMode === "value" && selectedKeyLabel && (
            <div className="ml-2 flex items-center bg-blue-100 text-blue-800 rounded px-2 py-1 text-sm">
              <span className="font-medium">{selectedKeyLabel}</span>
              <span className="mx-1 text-blue-600">=</span>
            </div>
          )}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={
              inputMode === "value"
                ? "Enter or select a value..."
                : "Filter by level, service, environment, tags..."
            }
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Loading indicator */}
          {isLoading && (
            <div className="pr-3">
              <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isDropdownOpen && dropdownItems.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {inputMode === "value" && (
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                Select a value for <span className="font-medium">{selectedKeyLabel}</span>
              </div>
            )}
            {dropdownItems.map((item, index) => (
              <button
                key={`${item.type}-${item.value}`}
                type="button"
                onClick={() => handleDropdownItemClick(item)}
                className={`
                  w-full px-4 py-2 text-left text-sm flex items-center justify-between
                  ${index === highlightedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}
                `}
              >
                <div className="flex items-center gap-2">
                  {item.type === "recent" && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {item.type === "key" && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  )}
                  {item.type === "custom" && (
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  )}
                  {item.type === "value" && (
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  <span className={item.type === "key" || item.type === "custom" ? "font-medium" : ""}>{item.label}</span>
                </div>
                {"description" in item && item.description && <span className="text-gray-400 text-xs">{item.description}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Show hint when in value mode with no matching dropdown items */}
        {isDropdownOpen && inputMode === "value" && dropdownItems.length === 0 && inputValue && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
            <p className="text-sm text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd> to filter by{" "}
              <span className="font-medium text-blue-600">
                {selectedKeyLabel}={inputValue}
              </span>
            </p>
          </div>
        )}
        </div>

        {/* Time Range - visible on large screens only */}
        <div className="hidden lg:block lg:flex-[2]">
          <TimeRangePicker
            value={timeRange}
            onChange={onTimeRangeChange}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Filter Chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 mr-1">Active filters:</span>
          {filters.map((filter) => (
            <FilterChip key={filter.id} filter={filter} onRemove={() => removeFilter(filter.id)} />
          ))}
          <button
            onClick={clearAllFilters}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50 ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
