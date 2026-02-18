import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1";

export async function POST(request: NextRequest) {
  try {
    const { invite_token, password } = await request.json();

    const xff = request.headers.get("x-forwarded-for");
    const response = await fetch(`${API_URL}/invites/${invite_token}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(xff && { "X-Forwarded-For": xff }),
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const cookieStore = await cookies();
    cookieStore.set("token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error("Accept invite proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to authentication service" },
      { status: 503 }
    );
  }
}
