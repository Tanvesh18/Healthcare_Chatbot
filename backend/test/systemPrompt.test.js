import test from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, MEDICAL_SAFETY_RULES } from "../services/systemPrompt.js";

test("defines the required medical safety behaviors", () => {
  assert.match(MEDICAL_SAFETY_RULES, /not a diagnosis/i);
  assert.match(MEDICAL_SAFETY_RULES, /ask concise, relevant follow-up questions/i);
  assert.match(MEDICAL_SAFETY_RULES, /known allergies/i);
  assert.match(MEDICAL_SAFETY_RULES, /current medicines/i);
  assert.match(MEDICAL_SAFETY_RULES, /Do not tell the user to start, stop, replace, or change the dose/i);
  assert.match(MEDICAL_SAFETY_RULES, /Separate routine self-care from reasons to seek professional care/i);
  assert.match(MEDICAL_SAFETY_RULES, /possible emergency warning signs/i);
  assert.match(MEDICAL_SAFETY_RULES, /Do not recite unrelated profile fields/i);
});

test("instructs the assistant to resolve profile conflicts safely", () => {
  assert.match(MEDICAL_SAFETY_RULES, /use the user's current statement for this conversation/i);
  assert.match(MEDICAL_SAFETY_RULES, /recommend updating the saved profile/i);
});

test("combines safety rules with relevant health-profile context", () => {
  const prompt = buildSystemPrompt({
    age: 34,
    conditions: ["Asthma"],
    allergies: ["Penicillin"],
    privacyConsents: {
      aiProfilePersonalization: { enabled: true }
    }
  });

  assert.match(prompt, /Age: 34/);
  assert.match(prompt, /Known conditions: Asthma/);
  assert.match(prompt, /Allergies: Penicillin/);
  assert.match(prompt, /not clinically verified/i);
  assert.match(prompt, /not a diagnosis/i);
});

test("does not request location for unrelated health questions", () => {
  const prompt = buildSystemPrompt({});

  assert.match(prompt, /If the user asks for nearby doctors, hospitals, or clinics/i);
  assert.match(prompt, /Do not imply that location access is needed for unrelated health questions/i);
  assert.match(prompt, /Do not offer location access.*unless the user asks for nearby care/i);
});

test("limits facility guidance to verified lookup results", () => {
  const prompt = buildSystemPrompt(
    {},
    "- Example Clinic (1.2 km away)",
    true
  );

  assert.match(prompt, /only verified nearby results/i);
  assert.match(prompt, /Example Clinic/);
  assert.match(prompt, /Do not add facilities from memory/i);
  assert.doesNotMatch(prompt, /12\.3/);
  assert.doesNotMatch(prompt, /45\.6/);
});

test("excludes stored health details without personalization consent", () => {
  const prompt = buildSystemPrompt({
    age: 34,
    conditions: ["Asthma"]
  });

  assert.match(prompt, /HEALTH PROFILE CONTEXT: NOT AUTHORIZED/);
  assert.doesNotMatch(prompt, /Age: 34/);
  assert.doesNotMatch(prompt, /Known conditions: Asthma/);
});

