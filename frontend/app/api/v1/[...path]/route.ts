import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1";

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const subpath = path.join("/");
    const query = request.nextUrl.search; // includes leading "?"

    const token = request.cookies.get("token")?.value;

    const headers: HeadersInit = {};
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const xff = request.headers.get("x-forwarded-for");
    if (xff) headers["X-Forwarded-For"] = xff;

    const body =
      request.method !== "GET" && request.method !== "HEAD"
        ? await request.arrayBuffer()
        : undefined;

    const upstream = await fetch(`${API_URL}/${subpath}${query}`, {
      method: request.method,
      headers,
      body,
    });

    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await upstream.arrayBuffer();
    const res = new NextResponse(data, { status: upstream.status });

    const ct = upstream.headers.get("content-type");
    if (ct) res.headers.set("Content-Type", ct);

    const usageWarning = upstream.headers.get("x-usage-warning");
    if (usageWarning) res.headers.set("X-Usage-Warning", usageWarning);

    return res;
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to API service" },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
