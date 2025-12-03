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
}

export interface CheckResult {
  id: number;
  check_id: number;
  created_at: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_message: string | null;
}

export interface CheckResultsResponse {
  results: CheckResult[];
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

// Helper to get auth token
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Base fetch wrapper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

// API methods
export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, org_name: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, org_name }),
    }),

  getMe: () => request<User>("/me"),

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
};
