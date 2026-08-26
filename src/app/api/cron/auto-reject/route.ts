import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized, sweepStaleOrders } from "@/lib/auto-reject";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rejected = await sweepStaleOrders();
  return NextResponse.json({ rejected });
}
