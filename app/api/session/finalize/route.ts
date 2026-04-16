import { NextRequest, NextResponse } from "next/server";
import { finalizeSession } from "@/lib/storage";
import { CompletionPayload } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<CompletionPayload>;

  if (
    !body.sessionId ||
    typeof body.batchIndex !== "number" ||
    !body.questionnaire ||
    !Array.isArray(body.responses)
  ) {
    return NextResponse.json({ error: "Missing final session data." }, { status: 400 });
  }

  try {
    await finalizeSession(body as CompletionPayload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to finalize the session." },
      { status: 400 },
    );
  }
}
