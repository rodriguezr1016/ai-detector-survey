import { WithId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import {
  QuestionnaireData,
  SessionAssignment,
  StudyUsageState,
  VideoResponse,
} from "@/lib/types";
import { getCorrectAnswerForVideo, getVideoBatches, getVideoLibrary } from "@/lib/videos";

const sessionsPerBatch = 3;
const studyStateDocumentId = "video-batches";

type StudyUsageDocument = StudyUsageState & {
  _id: string;
};

type SessionDocument = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: "assigned" | "completed";
  assignment: SessionAssignment;
  questionnaire: QuestionnaireData | null;
  responses: Array<
    Omit<VideoResponse, "sessionId"> & {
      isCorrect: boolean;
      correctAnswer: "ai" | "real";
      savedAt: string;
    }
  >;
  markdownReport: string;
};

function timestamp() {
  return new Date().toISOString();
}

function buildInitialUsageState(batchCount: number): StudyUsageState {
  return {
    batches: Array.from({ length: batchCount }, (_, index) => ({
      batchIndex: index,
      assignedSessions: 0,
      completedSessions: 0,
    })),
    sessionAssignments: {},
  };
}

function buildInitialMarkdown(
  sessionId: string,
  assignment: { batchNumber: number; totalBatches: number; completedBatchUsage: number },
) {
  return `# Research Session ${sessionId}

- Created: ${timestamp()}
- Assigned batch: ${assignment.batchNumber} of ${assignment.totalBatches}
- Completed batch count so far: ${assignment.completedBatchUsage} of ${sessionsPerBatch}

## Questionnaire

## Responses

`;
}

function appendQuestionnaireMarkdown(currentMarkdown: string, questionnaire: QuestionnaireData) {
  return `${currentMarkdown}## Questionnaire Completed

- Timestamp: ${timestamp()}
- Age: ${questionnaire.age}
- Gender: ${questionnaire.gender}
- Education level: ${questionnaire.educationLevel}
- AI content experience: ${questionnaire.aiContentExperience}
- Video production experience: ${questionnaire.videoProductionExperience}
- Eye problems: ${questionnaire.eyeProblems}

`;
}

function appendResponseMarkdown(currentMarkdown: string, response: VideoResponse) {
  const correctAnswer = getCorrectAnswerForVideo(response.videoId);
  const isCorrect = correctAnswer === response.answer;

  return `${currentMarkdown}### Video ${response.batchNumber}.${response.positionInBatch}

- Timestamp: ${timestamp()}
- Video ID: ${response.videoId}
- Video name: ${response.videoName}
- Video label: ${response.videoLabel}
- Answer: ${response.answer}
- Correct: ${isCorrect ? "Yes" : "No"}
- Reason: ${response.reason.replace(/\n/g, " ").trim()}
- Time elapsed (seconds): ${response.elapsedSeconds}

`;
}

function appendCompletionMarkdown(currentMarkdown: string, score: { correct: number; total: number; percent: number }) {
  return `${currentMarkdown}## Session Completed

- Timestamp: ${timestamp()}
- Score: ${score.correct} / ${score.total}
- Percent correct: ${score.percent}%

`;
}

async function getCollections() {
  const database = await getDatabase();

  return {
    studyState: database.collection<StudyUsageDocument>("study_state"),
    sessions: database.collection<SessionDocument>("sessions"),
  };
}

async function ensureStudyState() {
  const { studyState } = await getCollections();
  const batches = getVideoBatches(getVideoLibrary());

  if (batches.length === 0) {
    throw new Error("No video batches are configured.");
  }

  const initialState = buildInitialUsageState(batches.length);

  await studyState.updateOne(
    { _id: studyStateDocumentId },
    {
      $setOnInsert: {
        _id: studyStateDocumentId,
        batches: initialState.batches,
        sessionAssignments: initialState.sessionAssignments,
      },
    },
    { upsert: true },
  );

  const existingState = await studyState.findOne({ _id: studyStateDocumentId });

  if (!existingState) {
    throw new Error("Unable to initialize study state.");
  }

  if (existingState.batches.length !== batches.length) {
    const resizedState = buildInitialUsageState(batches.length);

    resizedState.batches = resizedState.batches.map((batch, index) => ({
      batchIndex: index,
      assignedSessions: existingState.batches[index]?.assignedSessions ?? 0,
      completedSessions: existingState.batches[index]?.completedSessions ?? 0,
    }));

    resizedState.sessionAssignments = existingState.sessionAssignments ?? {};

    await studyState.updateOne(
      { _id: studyStateDocumentId },
      {
        $set: {
          batches: resizedState.batches,
          sessionAssignments: resizedState.sessionAssignments,
        },
      },
    );

    return resizedState;
  }

  return existingState;
}

async function resetStudyCycle() {
  const { studyState } = await getCollections();
  const batches = getVideoBatches(getVideoLibrary());
  const resetState = buildInitialUsageState(batches.length);

  await studyState.updateOne(
    { _id: studyStateDocumentId },
    {
      $set: {
        batches: resetState.batches,
        sessionAssignments: resetState.sessionAssignments,
      },
    },
  );

  return {
    _id: studyStateDocumentId,
    ...resetState,
  };
}

async function getSession(sessionId: string) {
  const { sessions } = await getCollections();
  return sessions.findOne({ sessionId });
}

export async function assignBatchToSession(sessionId: string) {
  const { studyState, sessions } = await getCollections();
  const videoBatches = getVideoBatches(getVideoLibrary());
  let usageState = await ensureStudyState();

  if (usageState.batches.every((batch) => batch.completedSessions >= sessionsPerBatch)) {
    usageState = await resetStudyCycle();
  }

  const availableBatch = usageState.batches.find((batch) => batch.completedSessions < sessionsPerBatch);

  if (!availableBatch) {
    throw new Error("All configured video batches have already been assigned.");
  }

  const assignedAt = timestamp();
  const assignment: SessionAssignment = {
    batchIndex: availableBatch.batchIndex,
    assignedAt,
    completedAt: null,
    status: "assigned",
  };

  const updatedState = await studyState.findOneAndUpdate(
    { _id: studyStateDocumentId },
    {
      $set: {
        [`sessionAssignments.${sessionId}`]: assignment,
      },
    },
    { returnDocument: "after" },
  );

  if (!updatedState) {
    return assignBatchToSession(sessionId);
  }

  const assignmentSummary = {
    batchIndex: availableBatch.batchIndex,
    batchNumber: availableBatch.batchIndex + 1,
    totalBatches: videoBatches.length,
    completedBatchUsage: updatedState.batches[availableBatch.batchIndex].completedSessions,
  };

  await sessions.insertOne({
    sessionId,
    createdAt: assignedAt,
    updatedAt: assignedAt,
    status: "assigned",
    assignment,
    questionnaire: null,
    responses: [],
    markdownReport: buildInitialMarkdown(sessionId, assignmentSummary),
  });

  return assignmentSummary;
}

export async function getAssignedBatch(sessionId: string) {
  const session = await getSession(sessionId);
  const videoBatches = getVideoBatches(getVideoLibrary());

  if (!session) {
    throw new Error("This session does not have a batch assignment.");
  }

  const batchVideos = videoBatches[session.assignment.batchIndex];

  if (!batchVideos) {
    throw new Error("The assigned batch is no longer available.");
  }

  return {
    assignment: session.assignment,
    videos: batchVideos,
    totalBatches: videoBatches.length,
  };
}

export async function appendQuestionnaire(sessionId: string, questionnaire: QuestionnaireData) {
  const { sessions } = await getCollections();
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error("This session could not be found.");
  }

  await sessions.updateOne(
    { sessionId },
    {
      $set: {
        questionnaire,
        updatedAt: timestamp(),
        markdownReport: appendQuestionnaireMarkdown(session.markdownReport, questionnaire),
      },
    },
  );
}

export async function appendVideoResponse(response: VideoResponse) {
  const { sessions } = await getCollections();
  const session = await getSession(response.sessionId);

  if (!session) {
    throw new Error("This session could not be found.");
  }

  const savedAt = timestamp();
  const correctAnswer = getCorrectAnswerForVideo(response.videoId);

  if (!correctAnswer) {
    throw new Error(`Missing correct answer for video ${response.videoId}.`);
  }

  await sessions.updateOne(
    { sessionId: response.sessionId },
    {
      $push: {
        responses: {
          videoId: response.videoId,
          videoName: response.videoName,
          videoLabel: response.videoLabel,
          batchNumber: response.batchNumber,
          positionInBatch: response.positionInBatch,
          answer: response.answer,
          correctAnswer,
          isCorrect: response.answer === correctAnswer,
          reason: response.reason,
          elapsedSeconds: response.elapsedSeconds,
          savedAt,
        },
      },
      $set: {
        updatedAt: savedAt,
        markdownReport: appendResponseMarkdown(session.markdownReport, response),
      },
    },
  );
}

export async function markSessionComplete(sessionId: string) {
  const { sessions, studyState } = await getCollections();
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error("This session could not be found.");
  }

  if (session.status === "completed") {
    return;
  }

  const completedAt = timestamp();
  const correctResponses = session.responses.filter((response) => response.isCorrect).length;
  const totalResponses = session.responses.length;
  const percent = totalResponses === 0 ? 0 : Math.round((correctResponses / totalResponses) * 100);

  await sessions.updateOne(
    { sessionId },
    {
      $set: {
        status: "completed",
        updatedAt: completedAt,
        "assignment.status": "completed",
        "assignment.completedAt": completedAt,
        markdownReport: appendCompletionMarkdown(session.markdownReport, {
          correct: correctResponses,
          total: totalResponses,
          percent,
        }),
      },
    },
  );

  await studyState.updateOne(
    { _id: studyStateDocumentId },
    {
      $inc: {
        [`batches.${session.assignment.batchIndex}.completedSessions`]: 1,
      },
      $set: {
        [`sessionAssignments.${sessionId}.status`]: "completed",
        [`sessionAssignments.${sessionId}.completedAt`]: completedAt,
      },
    },
  );
}

export async function getSessionReport(sessionId: string) {
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error("This session could not be found.");
  }

  return session.markdownReport;
}

export async function getStudyUsageState() {
  const usageState = await ensureStudyState();
  return usageState as WithId<StudyUsageDocument>;
}
