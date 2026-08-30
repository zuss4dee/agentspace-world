import { NextResponse } from "next/server";
import { bearer, getSession, speak } from "@/lib/habitat-server";

export async function POST(request: Request) {
  const token = bearer(request.headers.get("authorization"));
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: "session_expired" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { text?: string };
  if (!body.text?.trim()) return NextResponse.json({ error: "text_required" }, { status: 400 });
  return NextResponse.json(speak(token!, body.text.trim()));
}
