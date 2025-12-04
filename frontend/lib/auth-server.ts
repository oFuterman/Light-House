import { cookies } from "next/headers";
import { User, Check, CheckResult, NotificationSettings } from "./api";

// For server-side requests, use internal Docker network URL if available
// INTERNAL_API_URL is used inside Docker (api:8080)
// Falls back to NEXT_PUBLIC_API_URL for local dev outside Docker
const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Helper to make authenticated requests from server components
async function serverRequest<T>(endpoint: string): Promise<T | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Get current user from server
export async function getServerUser(): Promise<User | null> {
  return serverRequest<User>("/me");
}

// Get all checks for the current user's org
export async function getServerChecks(): Promise<Check[]> {
  const checks = await serverRequest<Check[]>("/checks");
  return checks || [];
}

// Get a specific check by ID
export async function getServerCheck(id: string): Promise<Check | null> {
  return serverRequest<Check>(`/checks/${id}`);
}

// Get check results
export async function getServerCheckResults(
  id: string,
  windowHours: number = 24
): Promise<CheckResult[]> {
  const response = await serverRequest<{ results: CheckResult[] }>(
    `/checks/${id}/results?window_hours=${windowHours}`
  );
  return response?.results || [];
}

// Get notification settings
export async function getServerNotificationSettings(): Promise<NotificationSettings | null> {
  return serverRequest<NotificationSettings>("/notification-settings");
}

// Check if user is authenticated (for redirects)
export async function isAuthenticated(): Promise<boolean> {
  const user = await getServerUser();
  return user !== null;
}
