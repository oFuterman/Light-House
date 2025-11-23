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

  getCheckResults: (id: string) =>
    request<CheckResult[]>(`/checks/${id}/results`),

  // Logs
  getLogs: () => request<LogEvent[]>("/logs"),
};
