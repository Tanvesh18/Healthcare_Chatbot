import test from "node:test";
import assert from "node:assert/strict";
import { detectEmergency } from "../services/emergencyTriage.js";

const emergencyExamples = [
  ["I am having crushing chest pain", "chest-pain"],
  ["I can't breathe", "breathing"],
  ["My face is drooping and I have sudden trouble speaking", "stroke"],
  ["The bleeding won't stop", "bleeding"],
  ["Someone swallowed a whole bottle of pills", "overdose-or-poisoning"],
  ["She is unconscious", "unconsciousness"],
  ["I want to kill myself", "self-harm"],
  ["This is their first seizure", "seizure"],
  ["My tongue is swelling", "severe-allergic-reaction"]
];

for (const [message, category] of emergencyExamples) {
  test(`detects ${category}`, () => {
    const result = detectEmergency(message);

    assert.equal(result?.category, category);
    assert.match(result?.response || "", /emergency|safety/i);
  });
}

test("does not flag an explicitly negated symptom", () => {
  assert.equal(detectEmergency("I do not have chest pain, only a mild cough"), null);
  assert.equal(detectEmergency("I am not suicidal; I am asking for a school project"), null);
});

test("does not flag a general educational question", () => {
  assert.equal(detectEmergency("What are common causes of chest pain?"), null);
  assert.equal(detectEmergency("How do doctors identify a stroke?"), null);
});

