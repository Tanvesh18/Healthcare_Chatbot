import { buildSymptomAssessmentMessage } from "./utils/symptomAssessment";

test("formats completed assessment fields as conversation context", () => {
  const message = buildSymptomAssessmentMessage({
    symptom: "Headache",
    onset: "This morning",
    duration: "4 hours",
    severity: "6 out of 10",
    bodyLocation: "Behind the eyes",
    associatedSymptoms: "Nausea",
    currentMedicines: "None",
    pregnancyStatus: "Not applicable",
    relevantHistory: "Migraines"
  });

  expect(message).toContain("- Main symptom: Headache");
  expect(message).toContain("- Severity: 6 out of 10");
  expect(message).toContain("- Current medicines: None");
  expect(message).toContain("without diagnosing");
});

test("omits optional fields that the user skips", () => {
  const message = buildSymptomAssessmentMessage({
    symptom: "Mild cough",
    duration: "",
    currentMedicines: "   "
  });

  expect(message).toContain("- Main symptom: Mild cough");
  expect(message).not.toContain("- Duration:");
  expect(message).not.toContain("- Current medicines:");
});

test("requires a main symptom", () => {
  expect(() => buildSymptomAssessmentMessage({ symptom: " " }))
    .toThrow("Main symptom is required");
});

test("normalizes line breaks before creating the message", () => {
  const message = buildSymptomAssessmentMessage({
    symptom: "Lower\nback pain",
    associatedSymptoms: "Stiffness\r\nFatigue"
  });

  expect(message).toContain("- Main symptom: Lower back pain");
  expect(message).toContain("- Other symptoms: Stiffness Fatigue");
});
