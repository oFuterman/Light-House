const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Types
export type Role = "owner" | "admin" | "member";

export interface User {
  id: number;
  email: string;
  org_id: number;
  role: Role;
  org_name?: string;
  org_slug?: string;
}

export interface Member {
  id: number;
  email: string;
  role: Role;
  created_at: string;
}

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invite {
  id: number;
  email: string;
  role: Role;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  invited_by: string;
  accepted_at?: string;
}

export interface InviteInfo {
  email: string;
  org_name: string;
  org_slug: string;
  role: Role;
  expires_at: string;
}

export interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  resource_type?: string;
  resource_id?: number;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_email?: string;
}

export interface APIKeyScopeInfo {
  value: string;
  label: string;
  description: string;
}

export const API_KEY_SCOPES: APIKeyScopeInfo[] = [
  { value: "logs:write", label: "Write Logs", description: "Ingest log data" },
  { value: "traces:write", label: "Write Traces", description: "Ingest trace data" },
  { value: "logs:read", label: "Read Logs", description: "Query log data" },
  { value: "traces:read", label: "Read Traces", description: "Query trace data" },
  { value: "checks:read", label: "Read Checks", description: "View uptime checks" },
  { value: "checks:write", label: "Write Checks", description: "Create/update checks" },
  { value: "alerts:read", label: "Read Alerts", description: "View alerts" },
  { value: "*", label: "Full Access", description: "All permissions" },
];

export interface APIKey {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  created_by?: string;
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

// Slug types
export interface SlugSuggestion {
  slug: string;
  available: boolean;
}

export interface SlugSuggestionResponse {
  primary: SlugSuggestion;
  alternatives: SlugSuggestion[];
}

export interface SlugCheckResponse {
  slug: string;
  available: boolean;
  valid: boolean;
  error?: string;
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

// Billing types
export type Plan = "free" | "indie_pro" | "team" | "agency";

export interface PlanConfig {
  Name: string;
  MaxChecks: number;
  CheckIntervalMinSeconds: number;
  LogRetentionDays: number;
  LogVolumeBytesPerMonth: number;
  MaxStatusPages: number;
  MaxAPIKeys: number;
  AuditLogRetentionDays: number;
  AILevel1Limit: number;
  AILevel2Limit: number;
  AILevel3Limit: number;
  MonthlyPriceCents: number;
}

export interface UsageSnapshot {
  check_count: number;
  log_volume_bytes: number;
  status_page_count: number;
  api_key_count: number;
  ai_level1_calls: number;
  ai_level2_calls: number;
  ai_level3_calls: number;
}

export interface Violation {
  resource: string;
  current: number;
  limit: number;
  message: string;
}

export interface EntitlementResult {
  within_limits: boolean;
  violations?: Violation[];
  thresholds: Record<string, number>;
}

export interface PlanInfo {
  id: string;
  name: string;
  price_cents: number;
  max_checks: number;
  log_retention_days: number;
  log_volume_gb: number;
  check_interval_seconds: number;
  is_current: boolean;
}

export interface BillingResponse {
  plan: Plan;
  plan_config: PlanConfig;
  usage: UsageSnapshot;
  entitlements: EntitlementResult;
  subscription_status?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  available_plans: PlanInfo[];
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

  signup: (email: string, password: string, org_name: string, slug?: string) =>
    authRequest<{ user: User }>("/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, org_name, slug }),
    }),

  // Slug suggestion and validation (public - used during signup)
  suggestSlug: (org_name: string) =>
    fetch(`${API_URL}/auth/suggest-slug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_name }),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to get slug suggestions");
      }
      return res.json() as Promise<SlugSuggestionResponse>;
    }),

  checkSlug: (slug: string) =>
    fetch(`${API_URL}/auth/check-slug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to check slug");
      }
      return res.json() as Promise<SlugCheckResponse>;
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

  // Members
  getMembers: () =>
    request<{ members: Member[] }>("/members").then((res) => res.members),

  getMember: (id: number) =>
    request<Member>(`/members/${id}`),

  updateMemberRole: (id: number, role: Role) =>
    request<Member>(`/members/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  removeMember: (id: number) =>
    request<{ message: string }>(`/members/${id}`, {
      method: "DELETE",
    }),

  leaveOrganization: () =>
    request<{ message: string }>("/leave", {
      method: "POST",
    }),

  transferOwnership: (memberId: number) =>
    request<{ message: string }>(`/members/${memberId}/transfer-ownership`, {
      method: "POST",
    }),

  // Invites
  getInvites: () =>
    request<{ invites: Invite[] }>("/invites").then((res) => res.invites),

  createInvite: (email: string, role: Role) =>
    request<{ invite: Invite; invite_link: string }>("/invites", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  revokeInvite: (id: number) =>
    request<{ message: string }>(`/invites/${id}`, {
      method: "DELETE",
    }),

  resendInvite: (id: number) =>
    request<{ message: string; invite_link: string }>(`/invites/${id}/resend`, {
      method: "POST",
    }),

  // Public invite endpoints (no auth required)
  getInviteInfo: (token: string) =>
    fetch(`${API_URL}/invites/${token}`).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to get invite info");
      }
      return res.json() as Promise<InviteInfo>;
    }),

  acceptInvite: (token: string, password: string) =>
    fetch(`${API_URL}/invites/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to accept invite");
      }
      return res.json() as Promise<{ token: string; user: User }>;
    }),

  // Audit Logs
  getAuditLogs: (params?: { limit?: number; offset?: number; action?: string; window_hours?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    if (params?.action) searchParams.set("action", params.action);
    if (params?.window_hours) searchParams.set("window_hours", String(params.window_hours));
    const query = searchParams.toString();
    return request<{ audit_logs: AuditLog[]; total: number; limit: number; offset: number }>(
      `/audit-logs${query ? `?${query}` : ""}`
    );
  },

  getAuditLogActions: () =>
    request<{ actions: string[] }>("/audit-logs/actions").then((res) => res.actions),

  // API Keys
  getAPIKeys: () =>
    request<{ api_keys: APIKey[] }>("/api-keys").then((res) => res.api_keys),

  createAPIKey: (name: string, scopes: string[]) =>
    request<{ api_key: APIKey; key: string }>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, scopes }),
    }),

  deleteAPIKey: (id: number) =>
    request<{ message: string }>(`/api-keys/${id}`, {
      method: "DELETE",
    }),

  // Billing
  getBilling: () =>
    request<BillingResponse>("/billing/me"),

  getUsage: () =>
    request<UsageSnapshot>("/billing/usage"),

  createCheckoutSession: (plan: Plan) =>
    request<{ checkout_url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),

  createPortalSession: () =>
    request<{ portal_url: string }>("/billing/portal", {
      method: "POST",
    }),
};
