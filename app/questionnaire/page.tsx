"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { QuestionnaireData } from "@/lib/types";

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
  { value: "self-describe", label: "Self-describe" },
];

const educationOptions = [
  { value: "", label: "Select education level" },
  { value: "less-than-high-school", label: "Less than high school" },
  { value: "high-school", label: "High school diploma or GED" },
  { value: "some-college", label: "Some college" },
  { value: "associate", label: "Associate degree" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "doctorate", label: "Doctorate or professional degree" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const scaleOptions = [
  { value: "", label: "Select a rating" },
  { value: "1", label: "1 - None" },
  { value: "2", label: "2 - Low" },
  { value: "3", label: "3 - Moderate" },
  { value: "4", label: "4 - High" },
  { value: "5", label: "5 - Very high" },
];

const yesNoOptions = [
  { value: "", label: "Select yes or no" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const initialState: QuestionnaireData = {
  age: "",
  gender: "",
  educationLevel: "",
  aiContentExperience: "",
  videoProductionExperience: "",
  eyeProblems: "",
};

export default function QuestionnairePage() {
  const router = useRouter();
  const [form, setForm] = useState<QuestionnaireData>(initialState);
  const [sessionId, setSessionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedSessionId = localStorage.getItem("participantSessionId");

    if (!storedSessionId) {
      router.replace("/");
      return;
    }

    setSessionId(storedSessionId);
  }, [router]);

  function updateField<Key extends keyof QuestionnaireData>(key: Key, value: QuestionnaireData[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionId) {
      setError("The participant session is missing. Please restart from the consent page.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/questionnaire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          questionnaire: form,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save the questionnaire.");
      }

      router.push("/study");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Step 1</p>
        <h1>Questionnaire</h1>
        <p className="lead">Collect participant background information before the first video starts.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="age">Age</label>
            <input id="age" value={form.age} onChange={(event) => updateField("age", event.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              value={form.gender}
              onChange={(event) => updateField("gender", event.target.value)}
              required
            >
              {genderOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="educationLevel">Level of education</label>
            <select
              id="educationLevel"
              value={form.educationLevel}
              onChange={(event) => updateField("educationLevel", event.target.value)}
              required
            >
              {educationOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="aiContentExperience">Experience with AI content (1-5)</label>
            <select
              id="aiContentExperience"
              value={form.aiContentExperience}
              onChange={(event) => updateField("aiContentExperience", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="videoProductionExperience">Experience with video production (1-5)</label>
            <select
              id="videoProductionExperience"
              value={form.videoProductionExperience}
              onChange={(event) => updateField("videoProductionExperience", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={`video-${option.value || "placeholder"}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="eyeProblems">Do you have any eye problems or vision-related concerns?</label>
            <select
              id="eyeProblems"
              value={form.eyeProblems}
              onChange={(event) => updateField("eyeProblems", event.target.value)}
              required
            >
              {yesNoOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button className="button button-primary" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Continue to videos"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
