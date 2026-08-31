import { NextResponse } from "next/server";
import { bearer, getSession, heartbeat } from "@/lib/habitat-server";

export async function POST(request: Request) {
  const token = bearer(request.headers.get("authorization"));
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: "session_expired" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    online_for?: string;
    idle_extend?: string;
  };
  return NextResponse.json(heartbeat(token!, body));
}
