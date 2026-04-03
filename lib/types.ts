export type VideoSource = {
  id: string;
  label: string;
  url: string;
};

export type VideoClassification = "ai" | "real";

export type SessionAssignment = {
  batchIndex: number;
  assignedAt: string;
  completedAt: string | null;
  status: "assigned" | "completed";
};

export type BatchUsage = {
  batchIndex: number;
  assignedSessions: number;
  completedSessions: number;
};

export type StudyUsageState = {
  batches: BatchUsage[];
  sessionAssignments: Record<string, SessionAssignment>;
};

export type QuestionnaireData = {
  age: string;
  gender: string;
  educationLevel: string;
  aiContentExperience: string;
  videoProductionExperience: string;
  eyeProblems: string;
};

export type VideoResponse = {
  sessionId: string;
  videoId: string;
  videoName: string;
  videoLabel: string;
  batchNumber: number;
  positionInBatch: number;
  answer: VideoClassification;
  reason: string;
  elapsedSeconds: number;
};
