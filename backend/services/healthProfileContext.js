const MAX_TEXT_LENGTH = 80;
const MAX_LIST_ITEMS = 20;

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null || value === "") return "";

  return String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_LIST_ITEMS)
    .map(item => cleanText(item))
    .filter(Boolean);
}

function formatMedications(value) {
  if (!Array.isArray(value)) return "";

  return value
    .slice(0, MAX_LIST_ITEMS)
    .map(medication => {
      const details = [
        cleanText(medication?.name),
        cleanText(medication?.dosage),
        cleanText(medication?.frequency),
        cleanText(medication?.notes)
      ].filter(Boolean);

      return details.join("; ");
    })
    .filter(Boolean)
    .join(" | ");
}

function formatAdverseReactions(value) {
  if (!Array.isArray(value)) return "";

  return value
    .slice(0, MAX_LIST_ITEMS)
    .map(item => {
      const substance = cleanText(item?.substance);
      const reaction = cleanText(item?.reaction);
      if (!substance) return "";
      return reaction ? `${substance}: ${reaction}` : substance;
    })
    .filter(Boolean)
    .join(" | ");
}

export function buildHealthProfileContext(user) {
  const fields = [
    ["Age", cleanText(user?.age)],
    ["Height", user?.height === undefined || user?.height === null ? "" : `${cleanText(user.height)} cm`],
    ["Weight", user?.weight === undefined || user?.weight === null ? "" : `${cleanText(user.weight)} kg`],
    ["Gender", cleanText(user?.gender)],
    ["Blood group", cleanText(user?.bloodGroup)],
    ["Known conditions", cleanList(user?.conditions).join(", ")],
    ["Allergies", cleanList(user?.allergies).join(", ")],
    ["Current medicines", formatMedications(user?.medications)],
    ["Previous adverse reactions", formatAdverseReactions(user?.adverseReactions)],
    ["Smoking", cleanText(user?.smoking)],
    ["Alcohol", cleanText(user?.alcohol)],
    ["Activity level", cleanText(user?.activityLevel)]
  ].filter(([, value]) => value);

  if (fields.length === 0) {
    return `HEALTH PROFILE CONTEXT:
- No health-profile details have been provided.
- Do not infer or invent missing profile information.`;
  }

  return `HEALTH PROFILE CONTEXT (user-provided and not clinically verified):
${fields.map(([label, value]) => `- ${label}: ${value}`).join("\n")}

PROFILE USAGE RULES:
- Use these details only when they are relevant to the user's current question.
- Treat them as user-provided context, not as confirmed diagnoses or medical records.
- Do not infer or invent values for fields that are not listed.
- Consider known conditions, allergies, current medicines, and previous adverse reactions before offering general medicine, supplement, diet, or self-care information.
- Do not recommend starting, stopping, replacing, or changing the dose of a prescription medicine. Advise the user to confirm medication decisions with a qualified clinician or pharmacist.
- If current information conflicts with the stored profile, ask the user to clarify.
- Avoid repeating sensitive profile details unless doing so materially improves the answer.`;
}
