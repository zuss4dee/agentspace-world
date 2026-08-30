import { NextResponse } from "next/server";
import { worldSnapshot } from "@/lib/habitat-server";

export function GET() {
  return NextResponse.json({ pois: worldSnapshot().pois });
}
