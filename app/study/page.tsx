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
import { VideoSource } from "@/lib/types";

type StudyState = {
  currentVideoIndex: number;
  batchNumber: number;
  totalBatches: number;
  videos: VideoSource[];
};

const videosPerSurvey = 10;

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function StudyPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<"ai" | "real" | "">("");
  const [reason, setReason] = useState("");
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedSessionId = localStorage.getItem("participantSessionId");

    if (!storedSessionId) {
      router.replace("/");
      return;
    }

    setSessionId(storedSessionId);
  }, [router]);

  useEffect(() => {
    async function loadVideos() {
      const storedSessionId = localStorage.getItem("participantSessionId");
      const storedStudyState = localStorage.getItem("studyState");

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
        batchNumber: number;
        totalBatches: number;
        videos: VideoSource[];
      };
      const nextState: StudyState = {
        currentVideoIndex: 0,
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
    setTimerSeconds(0);
    setTimerRunning(false);
    setSelectedAnswer("");
    setReason("");
    setShowReasonModal(false);
    setError("");

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
    timerRef.current = window.setInterval(() => {
      setTimerSeconds((current) => current + 1);
    }, 1000);
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

    const response = await fetch("/api/session/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error || "Unable to complete the session.");
    }

    localStorage.removeItem("studyState");
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
      const response = await fetch("/api/response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          videoId: activeVideo.id,
          videoName: activeVideo.label,
          videoLabel: activeVideo.label,
          batchNumber: currentBatchNumber,
          positionInBatch: currentVideoNumber,
          answer: selectedAnswer,
          reason,
          elapsedSeconds: timerSeconds,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Unable to save this response.");
      }

      setShowReasonModal(false);
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
          <span className="pill">Timer {formatSeconds(timerSeconds)}</span>
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
