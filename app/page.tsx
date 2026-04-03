"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session", { method: "POST" });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Unable to start the session.");
      }

      const data = (await response.json()) as {
        sessionId: string;
        assignment: { batchNumber: number; totalBatches: number };
      };
      localStorage.setItem("participantSessionId", data.sessionId);
      localStorage.removeItem("studyState");
      router.push("/questionnaire");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">Research Study</p>
        <h1 className="title">Evaluate short videos and decide whether they feel AI-generated or real.</h1>
        <p className="lead">
          This landing page is ready for your full consent language, rules, disclaimers, and study instructions.
          Participants will only move forward after accepting.
        </p>

        <div className="grid two-column">
          <article className="card">
            <h2>What this flow already does</h2>
            <p className="muted">
              Collects participant background information, assigns each participant one randomized batch of ten
              videos, keeps each batch active until three completed surveys are submitted for it, and stores
              results centrally in MongoDB for later review.
            </p>
          </article>

          <article className="card">
            <h2>What you can customize next</h2>
            <p className="muted">
              Replace this copy, add your official study language, and swap the placeholder videos in
              <code> data/videos.json</code> with your Google Drive video sources.
            </p>
          </article>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button className="button button-primary" type="button" onClick={handleAccept} disabled={isLoading}>
            {isLoading ? "Starting..." : "Accept and continue"}
          </button>
        </div>
      </section>
    </main>
  );
}
