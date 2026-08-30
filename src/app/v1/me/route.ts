import { NextResponse } from "next/server";
import { bearer, getSession, perception } from "@/lib/habitat-server";

export function GET(request: Request) {
  const token = bearer(request.headers.get("authorization"));
  const session = getSession(token);
  if (!session || !token) return NextResponse.json({ error: "session_expired" }, { status: 401 });
  return NextResponse.json(perception(token));
}
