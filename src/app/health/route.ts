import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("ok", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
