import { NextRequest, NextResponse } from "next/server";
import { getAssignedBatch } from "@/lib/storage";
import { shuffleVideos } from "@/lib/videos";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
  }

  try {
    const { assignment, videos, totalBatches } = await getAssignedBatch(sessionId);

    return NextResponse.json({
      batchNumber: assignment.batchIndex + 1,
      totalBatches,
      videos: shuffleVideos(videos),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load the session videos." },
      { status: 404 },
    );
  }
}
