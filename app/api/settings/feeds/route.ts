import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { externalFeedSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const [row] = await db
    .select()
    .from(externalFeedSettings)
    .where(eq(externalFeedSettings.id, 1))
    .limit(1);

  return NextResponse.json({
    germanRoadmapUrl: row?.germanRoadmapUrl ?? "",
    personalAppUrl: row?.personalAppUrl ?? "",
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const germanRoadmapUrl = typeof body.germanRoadmapUrl === "string"
    ? body.germanRoadmapUrl.trim() || null
    : null;
  const personalAppUrl = typeof body.personalAppUrl === "string"
    ? body.personalAppUrl.trim() || null
    : null;

  await db
    .insert(externalFeedSettings)
    .values({ id: 1, germanRoadmapUrl, personalAppUrl, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: externalFeedSettings.id,
      set: { germanRoadmapUrl, personalAppUrl, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}