import { NextResponse } from "next/server";

/**
 * Lightweight health check for load balancers / uptime probes.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "greweco-affiliates",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
