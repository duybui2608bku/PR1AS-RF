import { NextResponse } from "next/server";
import { VN_PROVINCES_OPEN_API_V2 } from "@/lib/constants/vn-provinces";

export const revalidate = 86400;

export async function GET() {
  try {
    const res = await fetch(`${VN_PROVINCES_OPEN_API_V2}/p/`, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream provinces request failed" },
        { status: 502 }
      );
    }
    const data: unknown = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch provinces" },
      { status: 502 }
    );
  }
}
