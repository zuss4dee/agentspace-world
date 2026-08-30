import { NextResponse } from "next/server";
import { bearer, getSession, leave } from "@/lib/habitat-server";

export function POST(request: Request) {
  const token = bearer(request.headers.get("authorization"));
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: "session_expired" }, { status: 401 });
  return NextResponse.json(leave(token!));
}
