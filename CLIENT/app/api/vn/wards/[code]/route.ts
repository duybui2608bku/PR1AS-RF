import { NextResponse } from "next/server";
import { VN_PROVINCES_OPEN_API_V2 } from "@/lib/constants/vn-provinces";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const n = Number(code);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "Invalid ward code" }, { status: 400 });
  }

  try {
    const res = await fetch(`${VN_PROVINCES_OPEN_API_V2}/w/${n}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream ward lookup failed" },
        { status: 502 }
      );
    }
    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch ward" }, { status: 502 });
  }
}
