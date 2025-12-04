const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Types
export interface User {
  id: number;
  email: string;
  org_id: number;
}

export interface Check {
  id: number;
  org_id: number;
  name: string;
  url: string;
  interval_seconds: number;
  last_status: number | null;
  last_checked_at: string | null;
  is_active: boolean;
  service_name?: string;
  environment?: string;
  region?: string;
  tags?: Record<string, unknown>;
}

export interface CheckResult {
  id: number;
  check_id: number;
  created_at: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_message: string | null;
  org_id?: number;
  service_name?: string;
  environment?: string;
  region?: string;
  tags?: Record<string, unknown>;
  trace_id?: string;
}

export interface CheckResultsResponse {
  results: CheckResult[];
}

// Simplified CheckResult for search responses
export interface CheckResultSearchDTO {
  id: number;
  status_code: number;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
}

export interface CheckResultsParams {
  windowHours?: number;
  limit?: number;
}

export interface CheckSummary {
  check_id: number;
  window_hours: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  uptime_percentage: number;
  avg_response_ms: number;
  p95_response_ms: number;
  last_status: number | null;
  last_checked_at: string | null;
}

export interface LogEvent {
  id: number;
  org_id: number;
  timestamp: string;
  message: string;
  level: string;
  metadata: Record<string, unknown> | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface NotificationSettings {
  id?: number;
  email_recipients: string[];
  webhook_url?: string | null;
}

export interface Alert {
  id: number;
  created_at: string;
  check_id: number;
  check_name?: string;
  alert_type: "DOWN" | "RECOVERY";
  status_code: number;
  error_message?: string;
}

export interface AlertsResponse {
  alerts: Alert[];
}

export interface AlertsParams {
  windowHours?: number;
  limit?: number;
}

// Search DSL Types
export interface TimeRange {
  from?: string;
  to?: string;
}

export interface FilterCondition {
  field: string;
  op: string;
  value: unknown;
}

export interface TagFilter {
  key: string;
  op: string;
  value: string;
}

export interface SortField {
  field: string;
  dir: "asc" | "desc";
}

export interface SearchRequest {
  time_range?: TimeRange;
  filters?: FilterCondition[];
  tags?: TagFilter[];
  sort?: SortField[];
  limit?: number;
  offset?: number;
}

export interface SearchResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Log facets response for filter suggestions
export interface LogFacetsResponse {
  levels: string[];
  services: string[];
  environments: string[];
  regions: string[];
  tag_keys: string[];
  tag_values: Record<string, string[]>;
}

// LogEntry type for structured logs
export interface LogEntry {
  id: number;
  service_name: string;
  environment: string;
  region?: string;
  level: string;
  message: string;
  timestamp: string;
  trace_id?: string;
  span_id?: string;
  tags?: Record<string, unknown>;
}

// TraceSpan type for distributed tracing
export interface TraceSpan {
  id: number;
  service_name: string;
  environment?: string;
  operation: string;
  status: string;
  duration_ms: number;
  start_time: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  tags?: Record<string, unknown>;
}

// Base fetch wrapper
// Uses credentials: 'include' to send cookies with requests
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Send cookies with requests
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// Auth API - uses Next.js API routes (proxy) to set cookies on frontend domain
async function authRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/auth${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// API methods
export const api = {
  // Auth - proxied through Next.js API routes
  login: (email: string, password: string) =>
    authRequest<{ user: User }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, org_name: string) =>
    authRequest<{ user: User }>("/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, org_name }),
    }),

  getMe: () => request<User>("/me"),

  logout: () =>
    authRequest<{ message: string }>("/logout", {
      method: "POST",
    }),

  // Checks
  getChecks: () => request<Check[]>("/checks"),

  getCheck: (id: string) => request<Check>(`/checks/${id}`),

  createCheck: (data: { name: string; url: string; interval_seconds: number }) =>
    request<Check>("/checks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCheck: (id: string, data: Partial<Check>) =>
    request<Check>(`/checks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCheck: (id: string) =>
    request<void>(`/checks/${id}`, {
      method: "DELETE",
    }),

  getCheckResults: (id: string, params?: CheckResultsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.windowHours) {
      searchParams.set("window_hours", String(params.windowHours));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    const query = searchParams.toString();
    const url = `/checks/${id}/results${query ? `?${query}` : ""}`;
    return request<CheckResultsResponse>(url).then((res) => res.results);
  },

  getCheckSummary: (id: string | number, windowHours: number = 24) => {
    const url = `/checks/${id}/summary?window_hours=${windowHours}`;
    return request<CheckSummary>(url);
  },

  // Logs
  getLogs: () => request<LogEvent[]>("/logs"),

  // Notification Settings
  getNotificationSettings: () => request<NotificationSettings>("/notification-settings"),

  updateNotificationSettings: (settings: { email_recipients: string[]; webhook_url?: string | null }) =>
    request<NotificationSettings>("/notification-settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  // Alerts
  getCheckAlerts: (checkId: string | number, params?: AlertsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.windowHours) searchParams.set("window_hours", String(params.windowHours));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return request<AlertsResponse>(`/checks/${checkId}/alerts${query ? `?${query}` : ""}`).then((res) => res.alerts);
  },

  // Search endpoints
  searchLogs: (searchRequest: SearchRequest) =>
    request<SearchResponse<LogEntry>>("/logs/search", {
      method: "POST",
      body: JSON.stringify(searchRequest),
    }),

  getLogFacets: () =>
    request<LogFacetsResponse>("/logs/facets"),

  searchTraces: (searchRequest: SearchRequest) =>
    request<SearchResponse<TraceSpan>>("/traces/search", {
      method: "POST",
      body: JSON.stringify(searchRequest),
    }),

  searchChecks: (searchRequest: SearchRequest) =>
    request<SearchResponse<Check>>("/checks/search", {
      method: "POST",
      body: JSON.stringify(searchRequest),
    }),

  searchCheckResults: (checkId: string | number, searchRequest: SearchRequest) =>
    request<SearchResponse<CheckResultSearchDTO>>(`/checks/${checkId}/results/search`, {
      method: "POST",
      body: JSON.stringify(searchRequest),
    }),
};
