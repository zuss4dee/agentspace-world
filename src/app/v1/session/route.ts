import { NextResponse } from "next/server";
import { createSession, formatDuration } from "@/lib/habitat-server";
import { POIS } from "@/lib/pois";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    online_for?: string;
    idle_extend?: string;
    color?: string;
    shape?: string;
  };
  const { token, agent, onlineMs, idleMs } = createSession(body);
  return NextResponse.json(
    {
      status: "ready",
      token,
      agent_id: agent.id,
      username: agent.name,
      must_leave_at: new Date(agent.mustLeaveAt).toISOString(),
      idle_extend: formatDuration(idleMs),
      online_for: formatDuration(onlineMs),
      perception: {
        me: { id: agent.id, poi: agent.poi, x: agent.x, z: agent.y },
        nearby: [],
      },
      places: POIS.map((p) => ({ id: p.id, label: p.label })),
    },
    { status: 201 },
  );
}
