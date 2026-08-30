import { NextResponse } from "next/server";
import { listAgents } from "@/lib/habitat-server";

export function GET() {
  return NextResponse.json({
    agents: listAgents().map((a) => ({
      id: a.id,
      name: a.name,
      poi: a.poi,
      sitting: a.sitting,
    })),
  });
}
