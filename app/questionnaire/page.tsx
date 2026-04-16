"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { QuestionnaireData } from "@/lib/types";

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
  { value: "self-describe", label: "Self-describe" },
];

const ethnicityOptions = [
  { value: "", label: "Select ethnicity" },
  { value: "hispanic-latino-spanish-origin", label: "Hispanic/Latino/Spanish origin" },
  { value: "white", label: "White" },
  { value: "african-american", label: "African American" },
  { value: "asian", label: "Asian" },
  { value: "native-american-alaska-native", label: "Native American/Alaska Native" },
  { value: "native-hawaiian-other-pacific-islander", label: "Native Hawaiian/Other Pacific Islander" },
  { value: "mena", label: "Middle Eastern/North African (MENA)" },
  { value: "other-prefer-not-to-say", label: "Other/Prefer not to say" },
];

const scaleOptions = [
  { value: "", label: "Select a rating" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10" },
];

const yesNoOptions = [
  { value: "", label: "Select yes or no" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const initialState: QuestionnaireData = {
  ethnicity: "",
  age: "",
  gender: "",
  genderSelfDescribe: "",
  visualImpairment: "",
  studentStatus: "",
  aiExperience: "",
  filmingExperience: "",
  editingExperience: "",
  computerScienceExperience: "",
  plantIdentificationSkill: "",
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
      localStorage.setItem("studyQuestionnaire", JSON.stringify(form));
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
            <label htmlFor="ethnicity">What is your Ethnicity?</label>
            <select
              id="ethnicity"
              value={form.ethnicity}
              onChange={(event) => updateField("ethnicity", event.target.value)}
              required
            >
              {ethnicityOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="age">Age</label>
            <input
              id="age"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.age}
              onChange={(event) => updateField("age", event.target.value.replace(/\D/g, ""))}
              required
            />
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
            <label htmlFor="genderSelfDescribe">Gender self-description</label>
            <input
              id="genderSelfDescribe"
              value={form.genderSelfDescribe}
              onChange={(event) => updateField("genderSelfDescribe", event.target.value)}
              disabled={form.gender !== "self-describe"}
            />
          </div>

          <div className="field">
            <label htmlFor="visualImpairment">Do you have a visual impairment?</label>
            <select
              id="visualImpairment"
              value={form.visualImpairment}
              onChange={(event) => updateField("visualImpairment", event.target.value)}
              required
            >
              {yesNoOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="studentStatus">Are you a student?</label>
            <select
              id="studentStatus"
              value={form.studentStatus}
              onChange={(event) => updateField("studentStatus", event.target.value)}
              required
            >
              {yesNoOptions.map((option) => (
                <option key={option.value || "placeholder"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="aiExperience">How much experience do you have with AI? (1-10)</label>
            <select
              id="aiExperience"
              value={form.aiExperience}
              onChange={(event) => updateField("aiExperience", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={`ai-${option.value || "placeholder"}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="filmingExperience">How much experience do you have with Filming? (1-10)</label>
            <select
              id="filmingExperience"
              value={form.filmingExperience}
              onChange={(event) => updateField("filmingExperience", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={`filming-${option.value || "placeholder"}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="editingExperience">How much experience do you have with Editing? (1-10)</label>
            <select
              id="editingExperience"
              value={form.editingExperience}
              onChange={(event) => updateField("editingExperience", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={`editing-${option.value || "placeholder"}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="computerScienceExperience">How much experience do you have with Computer Science? (1-10)</label>
            <select
              id="computerScienceExperience"
              value={form.computerScienceExperience}
              onChange={(event) => updateField("computerScienceExperience", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={`cs-${option.value || "placeholder"}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="plantIdentificationSkill">How well can you identify plants from an image? (1-10)</label>
            <select
              id="plantIdentificationSkill"
              value={form.plantIdentificationSkill}
              onChange={(event) => updateField("plantIdentificationSkill", event.target.value)}
              required
            >
              {scaleOptions.map((option) => (
                <option key={`plants-${option.value || "placeholder"}`} value={option.value}>
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
