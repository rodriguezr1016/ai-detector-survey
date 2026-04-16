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
  ethnicity: string;
  age: string;
  gender: string;
  genderSelfDescribe: string;
  visualImpairment: string;
  studentStatus: string;
  aiExperience: string;
  filmingExperience: string;
  editingExperience: string;
  computerScienceExperience: string;
  plantIdentificationSkill: string;
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
  elapsedTime: number;
};

export type StoredVideoResponse = Omit<VideoResponse, "sessionId"> & {
  correctAnswer: VideoClassification;
  isCorrect: boolean;
  savedAt: string;
};

export type CompletionPayload = {
  sessionId: string;
  batchIndex: number;
  questionnaire: QuestionnaireData;
  responses: VideoResponse[];
};
