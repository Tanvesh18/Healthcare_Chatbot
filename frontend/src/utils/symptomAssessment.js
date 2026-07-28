const FIELD_LABELS = [
  ["symptom", "Main symptom"],
  ["onset", "When it started"],
  ["duration", "Duration"],
  ["severity", "Severity"],
  ["bodyLocation", "Body location"],
  ["associatedSymptoms", "Other symptoms"],
  ["currentMedicines", "Current medicines"],
  ["pregnancyStatus", "Pregnancy status"],
  ["relevantHistory", "Relevant history"]
];

function cleanValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildSymptomAssessmentMessage(assessment) {
  const details = FIELD_LABELS
    .map(([field, label]) => [label, cleanValue(assessment?.[field])])
    .filter(([, value]) => value);

  if (!details.some(([label]) => label === "Main symptom")) {
    throw new Error("Main symptom is required");
  }

  return [
    "Structured symptom assessment (user-provided):",
    ...details.map(([label, value]) => `- ${label}: ${value}`),
    "",
    "Please assess this information, ask any necessary safety-related follow-up questions, explain possible causes without diagnosing, and separate self-care from reasons to seek medical care."
  ].join("\n");
}

