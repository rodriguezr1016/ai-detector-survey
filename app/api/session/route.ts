import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getActiveBatchAssignment } from "@/lib/storage";

export async function POST() {
  const sessionId = randomUUID();

  try {
    const assignment = await getActiveBatchAssignment();
    return NextResponse.json({ sessionId, assignment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the session." },
      { status: 409 },
    );
  }
}
