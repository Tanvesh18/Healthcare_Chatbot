import { useEffect, useRef, useState } from "react";
import { FiActivity, FiSend, FiX } from "react-icons/fi";
import { buildSymptomAssessmentMessage } from "../utils/symptomAssessment";

const INITIAL_FORM = {
  symptom: "",
  onset: "",
  duration: "",
  severity: "",
  bodyLocation: "",
  associatedSymptoms: "",
  currentMedicines: "",
  pregnancyStatus: "",
  relevantHistory: ""
};

export default function SymptomAssessment({ onClose, onSubmit }) {
  const symptomInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    symptomInputRef.current?.focus();

    const handleKeyDown = event => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateField(field, value) {
    setForm(previous => ({ ...previous, [field]: value }));
    if (error) setError("");
  }

  function submit(event) {
    event.preventDefault();

    try {
      onSubmit(buildSymptomAssessmentMessage(form));
    } catch (submissionError) {
      setError(submissionError.message);
      symptomInputRef.current?.focus();
    }
  }

  return (
    <div className="assessment-overlay" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="assessment-dialog" role="dialog" aria-modal="true" aria-labelledby="assessment-title">
        <header className="assessment-header">
          <div>
            <span className="assessment-eyebrow"><FiActivity /> Guided assessment</span>
            <h2 id="assessment-title">Describe your symptoms</h2>
            <p>Only the main symptom is required. Skip anything you do not know or prefer not to share.</p>
          </div>
          <button type="button" className="assessment-close" onClick={onClose} aria-label="Close assessment">
            <FiX />
          </button>
        </header>

        <form className="assessment-form" onSubmit={submit}>
          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className="assessment-field assessment-field-wide">
            <label htmlFor="assessment-symptom">Main symptom</label>
            <input
              ref={symptomInputRef}
              id="assessment-symptom"
              value={form.symptom}
              onChange={event => updateField("symptom", event.target.value)}
              placeholder="e.g. headache, cough, stomach pain"
              maxLength={160}
              required
            />
          </div>

          <div className="assessment-field">
            <label htmlFor="assessment-onset">When did it start?</label>
            <input
              id="assessment-onset"
              value={form.onset}
              onChange={event => updateField("onset", event.target.value)}
              placeholder="e.g. suddenly this morning"
              maxLength={120}
            />
          </div>

          <div className="assessment-field">
            <label htmlFor="assessment-duration">How long has it lasted?</label>
            <input
              id="assessment-duration"
              value={form.duration}
              onChange={event => updateField("duration", event.target.value)}
              placeholder="e.g. 4 hours or 3 days"
              maxLength={120}
            />
          </div>

          <div className="assessment-field">
            <label htmlFor="assessment-severity">Severity</label>
            <select id="assessment-severity" value={form.severity} onChange={event => updateField("severity", event.target.value)}>
              <option value="">Not provided</option>
              <option value="1-3 out of 10 (mild)">1-3, mild</option>
              <option value="4-6 out of 10 (moderate)">4-6, moderate</option>
              <option value="7-8 out of 10 (severe)">7-8, severe</option>
              <option value="9-10 out of 10 (extreme)">9-10, extreme</option>
            </select>
          </div>

          <div className="assessment-field">
            <label htmlFor="assessment-location">Where do you feel it?</label>
            <input
              id="assessment-location"
              value={form.bodyLocation}
              onChange={event => updateField("bodyLocation", event.target.value)}
              placeholder="e.g. lower-right abdomen"
              maxLength={120}
            />
          </div>

          <div className="assessment-field assessment-field-wide">
            <label htmlFor="assessment-associated">Other symptoms</label>
            <textarea
              id="assessment-associated"
              value={form.associatedSymptoms}
              onChange={event => updateField("associatedSymptoms", event.target.value)}
              placeholder="e.g. nausea, fever, sensitivity to light"
              maxLength={400}
              rows={2}
            />
          </div>

          <div className="assessment-field">
            <label htmlFor="assessment-medicines">Current medicines</label>
            <textarea
              id="assessment-medicines"
              value={form.currentMedicines}
              onChange={event => updateField("currentMedicines", event.target.value)}
              placeholder="Names and doses, if known"
              maxLength={400}
              rows={2}
            />
          </div>

          <div className="assessment-field">
            <label htmlFor="assessment-pregnancy">Pregnancy status</label>
            <select
              id="assessment-pregnancy"
              value={form.pregnancyStatus}
              onChange={event => updateField("pregnancyStatus", event.target.value)}
            >
              <option value="">Not provided</option>
              <option value="Not applicable">Not applicable</option>
              <option value="Not pregnant">Not pregnant</option>
              <option value="Pregnant">Pregnant</option>
              <option value="Possibly pregnant or unsure">Possibly pregnant or unsure</option>
            </select>
          </div>

          <div className="assessment-field assessment-field-wide">
            <label htmlFor="assessment-history">Relevant health history</label>
            <textarea
              id="assessment-history"
              value={form.relevantHistory}
              onChange={event => updateField("relevantHistory", event.target.value)}
              placeholder="Conditions, recent injuries, procedures, or similar episodes"
              maxLength={500}
              rows={2}
            />
          </div>

          <footer className="assessment-actions">
            <button type="button" className="assessment-secondary" onClick={onClose}>Use free-form chat</button>
            <button type="submit" className="assessment-submit"><FiSend /> Submit assessment</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

