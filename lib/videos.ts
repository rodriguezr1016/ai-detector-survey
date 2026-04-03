import videos from "@/data/videos.json";
import { VideoClassification, VideoSource } from "@/lib/types";

type RawVideo = {
  id?: string;
  label?: string;
  url?: string;
  correctAnswer?: VideoClassification;
};

type VideoAnswerKey = {
  id: string;
  correctAnswer: VideoClassification;
};

function normalizeVideo(entry: RawVideo, index: number): VideoSource | null {
  const url = entry.url?.trim() || "";

  if (!url) {
    return null;
  }

  return {
    id: entry.id?.trim() || `video-${index + 1}`,
    label: entry.label?.trim() || `Video ${index + 1}`,
    url,
  };
}

export function getVideoLibrary(): VideoSource[] {
  return (videos as RawVideo[])
    .map((entry, index) => normalizeVideo(entry, index))
    .filter((entry): entry is VideoSource => Boolean(entry));
}

export function getVideoAnswerKeys(): VideoAnswerKey[] {
  return (videos as RawVideo[])
    .map((entry, index) => {
      const correctAnswer = entry.correctAnswer;

      if (correctAnswer !== "ai" && correctAnswer !== "real") {
        return null;
      }

      return {
        id: entry.id?.trim() || `video-${index + 1}`,
        correctAnswer,
      };
    })
    .filter((entry): entry is VideoAnswerKey => Boolean(entry));
}

export function getCorrectAnswerForVideo(videoId: string) {
  return getVideoAnswerKeys().find((entry) => entry.id === videoId)?.correctAnswer ?? null;
}

export function getVideoBatches(sourceVideos: VideoSource[], batchSize = 10) {
  const batches: VideoSource[][] = [];

  for (let index = 0; index < sourceVideos.length; index += batchSize) {
    batches.push(sourceVideos.slice(index, index + batchSize));
  }

  return batches;
}

export function shuffleVideos(sourceVideos: VideoSource[]) {
  const shuffledVideos = [...sourceVideos];

  for (let current = shuffledVideos.length - 1; current > 0; current -= 1) {
    const swapIndex = Math.floor(Math.random() * (current + 1));
    [shuffledVideos[current], shuffledVideos[swapIndex]] = [shuffledVideos[swapIndex], shuffledVideos[current]];
  }

  return shuffledVideos;
}
