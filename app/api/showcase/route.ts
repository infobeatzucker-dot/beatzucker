import { readShowcase } from "@/lib/showcasePublication";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await readShowcase(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Listening examples unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
