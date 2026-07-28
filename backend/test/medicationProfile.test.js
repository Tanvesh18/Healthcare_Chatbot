import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAdverseReactions,
  normalizeMedications
} from "../services/medicationProfile.js";

test("normalizes structured medication entries", () => {
  assert.deepEqual(normalizeMedications([{
    name: "  Metformin  ",
    dosage: "500 mg",
    frequency: "Twice daily",
    notes: "With\nfood"
  }]), [{
    name: "Metformin",
    dosage: "500 mg",
    frequency: "Twice daily",
    notes: "With food"
  }]);
});

test("supports clearing medication and reaction lists", () => {
  assert.deepEqual(normalizeMedications([]), []);
  assert.deepEqual(normalizeAdverseReactions([]), []);
});

test("requires medication names and rejects invalid structures", () => {
  assert.throws(
    () => normalizeMedications([{ dosage: "10 mg" }]),
    /requires a name/
  );
  assert.throws(
    () => normalizeMedications(["Aspirin"]),
    /must be an object/
  );
});

test("normalizes previous adverse reactions", () => {
  assert.deepEqual(normalizeAdverseReactions([{
    substance: " Ibuprofen ",
    reaction: "Facial\r\nswelling"
  }]), [{
    substance: "Ibuprofen",
    reaction: "Facial swelling"
  }]);
});

test("limits medication lists to twenty entries", () => {
  const medications = Array.from({ length: 21 }, (_, index) => ({ name: `Medicine ${index}` }));
  assert.throws(() => normalizeMedications(medications), /more than 20 entries/);
});

