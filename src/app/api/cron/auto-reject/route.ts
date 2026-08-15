import { NextRequest, NextResponse } from "next/server";
import { sweepStaleOrders } from "@/lib/auto-reject";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rejected = await sweepStaleOrders();
  return NextResponse.json({ rejected });
}
