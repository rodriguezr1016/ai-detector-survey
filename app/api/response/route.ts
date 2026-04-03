import { NextRequest, NextResponse } from "next/server";
import { appendVideoResponse } from "@/lib/storage";
import { VideoResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<VideoResponse>;

  if (
    !body.sessionId ||
    !body.videoId ||
    !body.videoName ||
    !body.videoLabel ||
    !body.answer ||
    typeof body.batchNumber !== "number" ||
    typeof body.positionInBatch !== "number" ||
    typeof body.elapsedSeconds !== "number"
  ) {
    return NextResponse.json({ error: "Missing response data." }, { status: 400 });
  }

  await appendVideoResponse(body as VideoResponse);
  return NextResponse.json({ ok: true });
}
