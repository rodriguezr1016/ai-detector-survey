import { NextRequest, NextResponse } from "next/server";
import { markSessionComplete } from "@/lib/storage";

type Payload = {
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Payload;

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
  }

  try {
    await markSessionComplete(body.sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete the session." },
      { status: 400 },
    );
  }
}
