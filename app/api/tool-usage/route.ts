import { NextResponse } from "next/server";
import { JsonBodyError, readBoundedJson } from "@/lib/boundedJson";
import { rateLimit } from "@/lib/rateLimit";
import { recordToolUsage, validUsage } from "@/lib/toolUsage";

export async function POST(request: Request) {
  // No cookies or identifying headers are used for the counters.
  const expected = new URL(process.env.NEXTAUTH_URL || "https://beatzucker.de").origin;
  if (request.headers.get("origin") !== expected) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("tool-usage:global", 600, 60000)) return NextResponse.json({ error: "Busy" }, { status: 429 });
  try {
    const body = await readBoundedJson(request, 512);
    if (!validUsage(body)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    await recordToolUsage(body.id as string, body.tool as string, body.outcome as string);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Statistics unavailable" }, { status: error instanceof JsonBodyError ? error.status : 503 });
  }
}
