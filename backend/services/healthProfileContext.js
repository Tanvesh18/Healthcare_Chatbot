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

export function buildHealthProfileContext(user) {
  const fields = [
    ["Age", cleanText(user?.age)],
    ["Height", user?.height === undefined || user?.height === null ? "" : `${cleanText(user.height)} cm`],
    ["Weight", user?.weight === undefined || user?.weight === null ? "" : `${cleanText(user.weight)} kg`],
    ["Gender", cleanText(user?.gender)],
    ["Blood group", cleanText(user?.bloodGroup)],
    ["Known conditions", cleanList(user?.conditions).join(", ")],
    ["Allergies", cleanList(user?.allergies).join(", ")],
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
- Consider known conditions and allergies before offering general medicine, diet, or self-care information.
- If current information conflicts with the stored profile, ask the user to clarify.
- Avoid repeating sensitive profile details unless doing so materially improves the answer.`;
}

