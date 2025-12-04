"use client";

import { LogFilter } from "@/lib/logs-filter";

interface FilterChipProps {
  filter: LogFilter;
  onRemove: () => void;
}

export function FilterChip({ filter, onRemove }: FilterChipProps) {
  // Use display-friendly field names
  const displayField = filter.field === "service_name" ? "service" : filter.field;

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 gap-1">
      <span className="font-medium">{displayField}</span>
      <span className="text-blue-600">:</span>
      <span>{filter.value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-blue-200 transition-colors"
        aria-label={`Remove ${displayField}:${filter.value} filter`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
