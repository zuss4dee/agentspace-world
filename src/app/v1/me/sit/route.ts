import { NextResponse } from "next/server";
import { bearer, getSession, sitAt } from "@/lib/habitat-server";

export async function POST(request: Request) {
  const token = bearer(request.headers.get("authorization"));
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: "session_expired" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { poi?: string };
  const result = sitAt(token!, body.poi ?? session.agent.poi);
  if (result && "error" in result) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result, { status: 202 });
}
