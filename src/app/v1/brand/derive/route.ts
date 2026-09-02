import { NextResponse } from "next/server";
import { deriveBrandProfile } from "@/lib/brand-derive";

/** GET /v1/brand/derive?url=https://example.com → BrandProfile JSON (always 200; `error` on failure). */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const profile = await deriveBrandProfile(url);
  return NextResponse.json(profile, { headers: { "cache-control": "no-store" } });
}
