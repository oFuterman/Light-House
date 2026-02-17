import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Legacy routes that should redirect to org-prefixed paths
// Mitigates: F3 (redirect loops), F6 (broken bookmarks)
const LEGACY_ROUTES = ["/dashboard", "/checks", "/settings", "/logs"];

// INTERNAL_API_URL is used inside Docker (api:8080), falls back to public URL
const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if already in /org/* path
  if (pathname.startsWith("/org/")) {
    return NextResponse.next();
  }

  // Check if this is a legacy protected route
  const isLegacyRoute = LEGACY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isLegacyRoute) {
    return NextResponse.next();
  }

  // Get auth token from cookie
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch user to get org_slug
  try {
    const res = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // Token invalid, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      // Clear invalid token cookie
      response.cookies.delete("token");
      return response;
    }

    const user = await res.json();

    // F2 mitigation: Check org_slug exists before redirect
    if (!user.org_slug) {
      console.error("User missing org_slug, cannot redirect to org route");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Construct new path with org prefix
    // /dashboard -> /org/{slug}/dashboard
    // /checks/123 -> /org/{slug}/checks/123
    const newPath = `/org/${user.org_slug}${pathname}`;
    return NextResponse.redirect(new URL(newPath, request.url), 308); // 308 = permanent redirect
  } catch (error) {
    console.error("Middleware fetch error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/checks/:path*",
    "/settings/:path*",
    "/logs/:path*",
  ],
};
