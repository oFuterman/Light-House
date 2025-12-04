import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the signup request to the backend
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Set the cookie on the frontend domain
    const cookieStore = await cookies();
    cookieStore.set("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400, // 24 hours
    });

    // Return user data (without token - it's in the cookie now)
    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error("Signup proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to authentication service" },
      { status: 503 }
    );
  }
}
