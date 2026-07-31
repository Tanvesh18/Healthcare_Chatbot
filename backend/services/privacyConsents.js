export const PRIVACY_POLICY_VERSION = "1.0";

export function isConsentEnabled(user, consentName) {
  return user?.privacyConsents?.[consentName]?.enabled === true;
}

export function buildConsentRecord(enabled, now = new Date()) {
  return {
    enabled,
    grantedAt: enabled ? now : null,
    revokedAt: enabled ? null : now,
    policyVersion: PRIVACY_POLICY_VERSION
  };
}

export function getPrivacyConsents(user) {
  return {
    aiProfilePersonalization: {
      enabled: isConsentEnabled(user, "aiProfilePersonalization")
    },
    locationCareSearch: {
      enabled: isConsentEnabled(user, "locationCareSearch")
    }
  };
}

export function getChatPrivacyState(user, locationRequested) {
  return {
    profilePersonalizationEnabled: isConsentEnabled(user, "aiProfilePersonalization"),
    locationConsentRequired:
      locationRequested && !isConsentEnabled(user, "locationCareSearch")
  };
}
