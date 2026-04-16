import { NextResponse } from "next/server";
import { getActiveBatchAssignment } from "@/lib/storage";
import { shuffleVideos } from "@/lib/videos";

export async function GET() {
  try {
    const { batchNumber, videos, totalBatches } = await getActiveBatchAssignment();

    return NextResponse.json({
      batchNumber,
      batchIndex: batchNumber - 1,
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
