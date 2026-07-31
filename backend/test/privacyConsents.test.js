import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConsentRecord,
  getChatPrivacyState,
  getPrivacyConsents,
  isConsentEnabled
} from "../services/privacyConsents.js";

test("treats missing privacy preferences as denied", () => {
  assert.equal(isConsentEnabled({}, "aiProfilePersonalization"), false);
  assert.equal(isConsentEnabled({}, "locationCareSearch"), false);
  assert.deepEqual(getPrivacyConsents({}), {
    aiProfilePersonalization: { enabled: false },
    locationCareSearch: { enabled: false }
  });
});

test("records grants and revocations with the policy version", () => {
  const now = new Date("2026-07-31T00:00:00.000Z");

  assert.deepEqual(buildConsentRecord(true, now), {
    enabled: true,
    grantedAt: now,
    revokedAt: null,
    policyVersion: "1.0"
  });
  assert.deepEqual(buildConsentRecord(false, now), {
    enabled: false,
    grantedAt: null,
    revokedAt: now,
    policyVersion: "1.0"
  });
});

test("reads explicitly granted consent only", () => {
  const user = {
    privacyConsents: {
      aiProfilePersonalization: { enabled: true },
      locationCareSearch: { enabled: false }
    }
  };

  assert.equal(isConsentEnabled(user, "aiProfilePersonalization"), true);
  assert.equal(isConsentEnabled(user, "locationCareSearch"), false);
});

test("blocks location forwarding unless location consent is granted", () => {
  assert.equal(getChatPrivacyState({}, true).locationConsentRequired, true);
  assert.equal(getChatPrivacyState({}, false).locationConsentRequired, false);
  assert.equal(getChatPrivacyState({
    privacyConsents: {
      locationCareSearch: { enabled: true }
    }
  }, true).locationConsentRequired, false);
});
