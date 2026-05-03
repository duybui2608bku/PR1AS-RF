import { NextResponse } from "next/server";
import { VN_PROVINCES_OPEN_API_V2 } from "@/lib/constants/vn-provinces";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const province = searchParams.get("province") ?? "0";

  try {
    const upstream = new URL(`${VN_PROVINCES_OPEN_API_V2}/w/`);
    upstream.searchParams.set("search", search);
    upstream.searchParams.set("province", province);

    const res = await fetch(upstream.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream wards request failed" },
        { status: 502 }
      );
    }
    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch wards" }, { status: 502 });
  }
}
