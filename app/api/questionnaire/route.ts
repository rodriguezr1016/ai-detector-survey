import { NextRequest, NextResponse } from "next/server";
import { appendQuestionnaire } from "@/lib/storage";
import { QuestionnaireData } from "@/lib/types";

type Payload = {
  sessionId?: string;
  questionnaire?: QuestionnaireData;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Payload;

  if (!body.sessionId || !body.questionnaire) {
    return NextResponse.json({ error: "Missing questionnaire data." }, { status: 400 });
  }

  await appendQuestionnaire(body.sessionId, body.questionnaire);
  return NextResponse.json({ ok: true });
}
