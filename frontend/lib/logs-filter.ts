import { SearchRequest, FilterCondition, TagFilter } from "./api";
import { TimeRange } from "@/components/TimeRangePicker";

export interface LogFilter {
  id: string;
  field: string;
  value: string;
  isTag: boolean;
}

export interface FieldSuggestion {
  key: string;
  label: string;
  description: string;
  values: string[] | null;
}

export const STANDARD_FIELDS: FieldSuggestion[] = [
  { key: "level", label: "level", description: "Log level", values: ["DEBUG", "INFO", "WARN", "ERROR"] },
  { key: "service_name", label: "service", description: "Service name", values: null },
  { key: "environment", label: "environment", description: "Environment", values: null },
  { key: "region", label: "region", description: "Region", values: null },
  { key: "message", label: "message", description: "Message content", values: null },
];

// Map display labels to actual field names
const FIELD_LABEL_TO_KEY: Record<string, string> = {
  level: "level",
  service: "service_name",
  service_name: "service_name",
  environment: "environment",
  env: "environment",
  region: "region",
  message: "message",
  msg: "message",
};

export function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parseFilterString(input: string): { field: string; value: string } | null {
  const colonIndex = input.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const field = input.slice(0, colonIndex).trim().toLowerCase();
  const value = input.slice(colonIndex + 1).trim();

  if (!field || !value) {
    return null;
  }

  return { field, value };
}

export function normalizeFieldName(field: string): string {
  return FIELD_LABEL_TO_KEY[field.toLowerCase()] || field;
}

export function isStandardField(field: string): boolean {
  const normalizedField = normalizeFieldName(field);
  return STANDARD_FIELDS.some((f) => f.key === normalizedField);
}

export function createFilter(field: string, value: string): LogFilter {
  const normalizedField = normalizeFieldName(field);
  return {
    id: generateFilterId(),
    field: normalizedField,
    value,
    isTag: !isStandardField(normalizedField),
  };
}

export function filtersToSearchRequest(filters: LogFilter[], timeRange: TimeRange): SearchRequest {
  const filterConditions: FilterCondition[] = [];
  const tagFilters: TagFilter[] = [];

  for (const filter of filters) {
    if (filter.isTag) {
      tagFilters.push({
        key: filter.field,
        op: "eq",
        value: filter.value,
      });
    } else {
      // Message field uses "contains" operator, others use "eq"
      const op = filter.field === "message" ? "contains" : "eq";
      filterConditions.push({
        field: filter.field,
        op,
        value: filter.value,
      });
    }
  }

  return {
    time_range: {
      from: timeRange.from.toISOString(),
      to: timeRange.to.toISOString(),
    },
    filters: filterConditions,
    tags: tagFilters,
    sort: [{ field: "timestamp", dir: "desc" }],
    limit: 100,
    offset: 0,
  };
}

export function filterToString(filter: LogFilter): string {
  // Use display label for standard fields
  const displayField = STANDARD_FIELDS.find((f) => f.key === filter.field)?.label || filter.field;
  return `${displayField}:${filter.value}`;
}

export function isDuplicateFilter(filters: LogFilter[], field: string, value: string): boolean {
  const normalizedField = normalizeFieldName(field);
  return filters.some((f) => f.field === normalizedField && f.value === value);
}
