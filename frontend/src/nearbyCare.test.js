import { isNearbyRequest } from "./utils/nearbyCare";

test.each([
  "find hospitals nearby",
  "show me nearby clinics",
  "where is the nearest pharmacy?",
  "doctors around me",
  "find care near me"
])("recognizes nearby-care request: %s", text => {
  expect(isNearbyRequest(text)).toBe(true);
});

test.each([
  "what does a hospital do?",
  "tell me about pharmacy careers",
  "how can I care for a minor cut?"
])("does not request location for unrelated message: %s", text => {
  expect(isNearbyRequest(text)).toBe(false);
});
