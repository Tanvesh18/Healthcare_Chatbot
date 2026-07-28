const MAX_ITEMS = 20;
const MAX_NAME_LENGTH = 120;
const MAX_DETAIL_LENGTH = 160;
const MAX_NOTES_LENGTH = 300;

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function requireArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw validationError(`${field} must be an array`);
  if (value.length > MAX_ITEMS) throw validationError(`${field} cannot contain more than ${MAX_ITEMS} entries`);
  return value;
}

export function normalizeMedications(value) {
  const medications = requireArray(value, "medications");
  if (medications === undefined) return undefined;

  return medications.map((medication, index) => {
    if (!medication || typeof medication !== "object" || Array.isArray(medication)) {
      throw validationError(`Medication ${index + 1} must be an object`);
    }

    const normalized = {
      name: cleanText(medication.name, MAX_NAME_LENGTH),
      dosage: cleanText(medication.dosage, MAX_DETAIL_LENGTH),
      frequency: cleanText(medication.frequency, MAX_DETAIL_LENGTH),
      notes: cleanText(medication.notes, MAX_NOTES_LENGTH)
    };

    if (!normalized.name) {
      throw validationError(`Medication ${index + 1} requires a name`);
    }

    return normalized;
  });
}

export function normalizeAdverseReactions(value) {
  const reactions = requireArray(value, "adverseReactions");
  if (reactions === undefined) return undefined;

  return reactions.map((reaction, index) => {
    if (!reaction || typeof reaction !== "object" || Array.isArray(reaction)) {
      throw validationError(`Adverse reaction ${index + 1} must be an object`);
    }

    const normalized = {
      substance: cleanText(reaction.substance, MAX_NAME_LENGTH),
      reaction: cleanText(reaction.reaction, MAX_NOTES_LENGTH)
    };

    if (!normalized.substance) {
      throw validationError(`Adverse reaction ${index + 1} requires a medicine or substance`);
    }

    return normalized;
  });
}

