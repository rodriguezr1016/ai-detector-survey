import { WithId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import {
  CompletionPayload,
  QuestionnaireData,
  SessionAssignment,
  StoredVideoResponse,
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
  status: "completed";
  assignment: SessionAssignment;
  questionnaire: QuestionnaireData;
  responses: StoredVideoResponse[];
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
- Ethnicity: ${questionnaire.ethnicity}
- Age: ${questionnaire.age}
- Gender: ${questionnaire.gender}
- Gender self-description: ${questionnaire.genderSelfDescribe || "N/A"}
- Visual impairment: ${questionnaire.visualImpairment}
- Student: ${questionnaire.studentStatus}
- AI experience (1-10): ${questionnaire.aiExperience}
- Filming experience (1-10): ${questionnaire.filmingExperience}
- Editing experience (1-10): ${questionnaire.editingExperience}
- Computer Science experience (1-10): ${questionnaire.computerScienceExperience}
- Plant identification from image (1-10): ${questionnaire.plantIdentificationSkill}

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
- Elapsed time: ${response.elapsedTime.toFixed(2)} seconds

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

export async function getActiveBatchAssignment() {
  const videoBatches = getVideoBatches(getVideoLibrary());
  let usageState = await ensureStudyState();

  if (usageState.batches.every((batch) => batch.completedSessions >= sessionsPerBatch)) {
    usageState = await resetStudyCycle();
  }

  const availableBatch = usageState.batches.find((batch) => batch.completedSessions < sessionsPerBatch);

  if (!availableBatch) {
    throw new Error("All configured video batches have already been assigned.");
  }

  return {
    batchIndex: availableBatch.batchIndex,
    batchNumber: availableBatch.batchIndex + 1,
    totalBatches: videoBatches.length,
    completedBatchUsage: usageState.batches[availableBatch.batchIndex].completedSessions,
    videos: videoBatches[availableBatch.batchIndex],
  };
}

function buildStoredResponses(responses: VideoResponse[]): StoredVideoResponse[] {
  return responses.map((response) => {
    const correctAnswer = getCorrectAnswerForVideo(response.videoId);

    if (!correctAnswer) {
      throw new Error(`Missing correct answer for video ${response.videoId}.`);
    }

    return {
      videoId: response.videoId,
      videoName: response.videoName,
      videoLabel: response.videoLabel,
      batchNumber: response.batchNumber,
      positionInBatch: response.positionInBatch,
      answer: response.answer,
      correctAnswer,
      isCorrect: response.answer === correctAnswer,
      reason: response.reason,
      elapsedTime: response.elapsedTime,
      savedAt: timestamp(),
    };
  });
}

function buildMarkdownReport(
  sessionId: string,
  assignment: { batchNumber: number; totalBatches: number; completedBatchUsage: number },
  questionnaire: QuestionnaireData,
  responses: VideoResponse[],
  score: { correct: number; total: number; percent: number },
) {
  let markdown = buildInitialMarkdown(sessionId, assignment);
  markdown = appendQuestionnaireMarkdown(markdown, questionnaire);

  for (const response of responses) {
    markdown = appendResponseMarkdown(markdown, response);
  }

  return appendCompletionMarkdown(markdown, score);
}

export async function finalizeSession(payload: CompletionPayload) {
  const { sessions, studyState } = await getCollections();
  const sessionExists = await sessions.findOne({ sessionId: payload.sessionId });

  if (sessionExists) {
    return;
  }

  const usageState = await ensureStudyState();
  const batch = usageState.batches[payload.batchIndex];

  if (!batch) {
    throw new Error("The requested batch is not available.");
  }

  const createdAt = timestamp();
  const storedResponses = buildStoredResponses(payload.responses);
  const correctResponses = storedResponses.filter((response) => response.isCorrect).length;
  const totalResponses = storedResponses.length;
  const percent = totalResponses === 0 ? 0 : Math.round((correctResponses / totalResponses) * 100);
  const assignment: SessionAssignment = {
    batchIndex: payload.batchIndex,
    assignedAt: createdAt,
    completedAt: createdAt,
    status: "completed",
  };

  await sessions.insertOne({
    sessionId: payload.sessionId,
    createdAt,
    updatedAt: createdAt,
    status: "completed",
    assignment,
    questionnaire: payload.questionnaire,
    responses: storedResponses,
    markdownReport: buildMarkdownReport(
      payload.sessionId,
      {
        batchNumber: payload.batchIndex + 1,
        totalBatches: usageState.batches.length,
        completedBatchUsage: batch.completedSessions,
      },
      payload.questionnaire,
      payload.responses,
      {
        correct: correctResponses,
        total: totalResponses,
        percent,
      },
    ),
  });

  await studyState.updateOne(
    { _id: studyStateDocumentId },
    {
      $inc: {
        [`batches.${payload.batchIndex}.completedSessions`]: 1,
      },
      $set: {
        [`sessionAssignments.${payload.sessionId}`]: assignment,
      },
    },
  );
}

async function getSession(sessionId: string) {
  const { sessions } = await getCollections();
  return sessions.findOne({ sessionId });
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
