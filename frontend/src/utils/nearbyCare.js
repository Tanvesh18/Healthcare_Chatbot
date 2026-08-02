const FACILITY_PATTERN = "(?:doctors?|hospitals?|clinics?|pharmacy|pharmacies|care)";
const PROXIMITY_PATTERN = "(?:near me|nearby|around me|nearest|closest)";

const nearbyRequestPattern = new RegExp(
  `\\b${PROXIMITY_PATTERN}\\b.*\\b${FACILITY_PATTERN}\\b|` +
  `\\b${FACILITY_PATTERN}\\b.*\\b${PROXIMITY_PATTERN}\\b`,
  "i"
);

export function isNearbyRequest(text) {
  return nearbyRequestPattern.test(String(text || ""));
}
