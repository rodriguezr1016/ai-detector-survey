"use client";

import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QuestionnaireData, VideoResponse, VideoSource } from "@/lib/types";

type StudyState = {
  currentVideoIndex: number;
  batchIndex: number;
  batchNumber: number;
  totalBatches: number;
  videos: VideoSource[];
};

const videosPerSurvey = 10;

function formatElapsedTime(totalCentiseconds: number) {
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

export default function StudyPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<"ai" | "real" | "">("");
  const [reason, setReason] = useState("");
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [responses, setResponses] = useState<VideoResponse[]>([]);
  const [hasStartedVideo, setHasStartedVideo] = useState(false);

  useEffect(() => {
    const storedSessionId = localStorage.getItem("participantSessionId");
    const storedQuestionnaire = localStorage.getItem("studyQuestionnaire");

    if (!storedSessionId || !storedQuestionnaire) {
      router.replace("/questionnaire");
      return;
    }

    setSessionId(storedSessionId);
  }, [router]);

  useEffect(() => {
    async function loadVideos() {
      const storedSessionId = localStorage.getItem("participantSessionId");
      const storedStudyState = localStorage.getItem("studyState");
      const storedResponses = localStorage.getItem("studyResponses");

      if (storedResponses) {
        setResponses(JSON.parse(storedResponses) as VideoResponse[]);
      }

      if (storedStudyState) {
        setStudyState(JSON.parse(storedStudyState) as StudyState);
        return;
      }

      if (!storedSessionId) {
        setError("The participant session is missing. Please restart from the consent page.");
        return;
      }

      const response = await fetch(`/api/videos?sessionId=${encodeURIComponent(storedSessionId)}`);

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error || "Unable to load the study videos.");
        return;
      }

      const data = (await response.json()) as {
        batchIndex: number;
        batchNumber: number;
        totalBatches: number;
        videos: VideoSource[];
      };
      const nextState: StudyState = {
        currentVideoIndex: 0,
        batchIndex: data.batchIndex,
        batchNumber: data.batchNumber,
        totalBatches: data.totalBatches,
        videos: data.videos,
      };

      localStorage.setItem("studyState", JSON.stringify(nextState));
      setStudyState(nextState);
    }

    void loadVideos();
  }, [router]);

  const activeVideo = useMemo(() => {
    if (!studyState) {
      return null;
    }

    return studyState.videos[studyState.currentVideoIndex] ?? null;
  }, [studyState]);

  const currentVideoNumber = (studyState?.currentVideoIndex ?? 0) + 1;
  const currentBatchNumber = studyState?.batchNumber ?? 0;

  useEffect(() => {
    setElapsedTime(0);
    setTimerRunning(false);
    setSelectedAnswer("");
    setReason("");
    setShowReasonModal(false);
    setError("");
    setHasStartedVideo(false);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      enforceMutedPlayback();
    }
  }, [activeVideo?.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  function persistStudyState(nextState: StudyState) {
    localStorage.setItem("studyState", JSON.stringify(nextState));
    setStudyState(nextState);
  }

  function enforceMutedPlayback() {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.muted = true;
    videoRef.current.defaultMuted = true;
    videoRef.current.volume = 0;
  }

  function startTimer() {
    if (timerRunning) {
      return;
    }

    setTimerRunning(true);
    setHasStartedVideo(true);
    timerRef.current = window.setInterval(() => {
      setElapsedTime((current) => current + 1);
    }, 10);
  }

  function handleStart() {
    if (timerRunning) {
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      enforceMutedPlayback();
      void videoRef.current.play();
    }
  }

  function handleChoiceChange(answer: "ai" | "real" | "") {
    setSelectedAnswer(answer);
  }

  function handleInitialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAnswer) {
      setError("Choose either AI or Real before submitting.");
      return;
    }

    if (!hasStartedVideo) {
      setError("Press Start before submitting an answer.");
      return;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTimerRunning(false);
    videoRef.current?.pause();
    setShowReasonModal(true);
    setError("");
  }

  async function advanceToNextVideo() {
    if (!studyState) {
      return;
    }

    if (studyState.currentVideoIndex + 1 < studyState.videos.length) {
      persistStudyState({
        ...studyState,
        currentVideoIndex: studyState.currentVideoIndex + 1,
      });
      return;
    }

    localStorage.removeItem("studyQuestionnaire");
    localStorage.removeItem("studyState");
    localStorage.removeItem("studyResponses");
    router.push("/complete");
  }

  async function handleReasonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeVideo || !selectedAnswer || !sessionId) {
      setError("The session is missing required information.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const nextResponses = [
        ...responses,
        {
          sessionId,
          videoId: activeVideo.id,
          videoName: activeVideo.label,
          videoLabel: activeVideo.label,
          batchNumber: currentBatchNumber,
          positionInBatch: currentVideoNumber,
          answer: selectedAnswer,
          reason,
          elapsedTime: elapsedTime / 100,
        },
      ];

      setResponses(nextResponses);
      localStorage.setItem("studyResponses", JSON.stringify(nextResponses));
      setShowReasonModal(false);

      if (studyState && studyState.currentVideoIndex + 1 >= studyState.videos.length) {
        const storedQuestionnaire = localStorage.getItem("studyQuestionnaire");

        if (!storedQuestionnaire) {
          throw new Error("The questionnaire data is missing.");
        }

        const completionResponse = await fetch("/api/session/finalize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            batchIndex: studyState.batchIndex,
            questionnaire: JSON.parse(storedQuestionnaire) as QuestionnaireData,
            responses: nextResponses,
          }),
        });

        if (!completionResponse.ok) {
          const body = (await completionResponse.json()) as { error?: string };
          throw new Error(body.error || "Unable to finalize the session.");
        }
      }

      await advanceToNextVideo();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!studyState || !activeVideo) {
    return (
      <main className="shell">
        <section className="panel">
          <p className="lead">{error || "Loading study..."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel study-layout">
        <div>
          <p className="eyebrow">Step 2</p>
          <h1>Video evaluation</h1>
          <p className="lead">Start the timer to begin. The timer keeps running even if the participant pauses the video.</p>
        </div>

        <div className="stats">
          <span className="pill">Video {currentVideoNumber} / {videosPerSurvey}</span>
          <span className="pill">Elapsed time {formatElapsedTime(elapsedTime)}</span>
        </div>

        <div className="video-frame">
          <video
            ref={videoRef}
            src={activeVideo.url}
            controls
            loop
            playsInline
            muted
            onPlay={startTimer}
            onLoadedMetadata={enforceMutedPlayback}
            onVolumeChange={enforceMutedPlayback}
          />
        </div>

        <form className="grid" onSubmit={handleInitialSubmit}>
          <div className="actions">
            <button className="button button-primary" type="button" onClick={handleStart} disabled={timerRunning}>
              {timerRunning ? "Running..." : "Start"}
            </button>
          </div>

          <div className="choice-row">
            <label className="choice" htmlFor="answer-ai">
              <input
                id="answer-ai"
                type="checkbox"
                checked={selectedAnswer === "ai"}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleChoiceChange(event.target.checked ? "ai" : "")
                }
              />
              AI
            </label>

            <label className="choice" htmlFor="answer-real">
              <input
                id="answer-real"
                type="checkbox"
                checked={selectedAnswer === "real"}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleChoiceChange(event.target.checked ? "real" : "")
                }
              />
              Real
            </label>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button className="button button-secondary" type="submit">
              Submit answer
            </button>
          </div>
        </form>
      </section>

      {showReasonModal ? (
        <div className="overlay">
          <section className="panel modal">
            <p className="eyebrow">Explain the answer</p>
            <h2>Why did the participant choose {selectedAnswer.toUpperCase()}?</h2>
            <form className="form" onSubmit={handleReasonSubmit}>
              <div className="field">
                <label htmlFor="reason">Reasoning</label>
                <textarea
                  id="reason"
                  rows={6}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                />
              </div>

              <div className="actions">
                <button className="button button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Continue"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
