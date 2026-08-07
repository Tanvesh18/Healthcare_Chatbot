import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  DEFAULT_JWT_EXPIRES_IN,
  getJwtExpiry,
  isSessionCurrent,
  signSessionToken,
  validateSecurityConfiguration
} from "../services/sessionSecurity.js";

test("session tokens contain an expiry and session version", () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousExpiry = process.env.JWT_EXPIRES_IN;
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "15m";

  try {
    const token = signSessionToken({ _id: "user-123", sessionVersion: 4 });
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    assert.equal(payload.id, "user-123");
    assert.equal(payload.sessionVersion, 4);
    assert.ok(payload.exp > payload.iat);
    assert.equal(payload.exp - payload.iat, 15 * 60);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = previousExpiry;
  }
});

test("uses a safe default token lifetime", () => {
  const previousExpiry = process.env.JWT_EXPIRES_IN;
  delete process.env.JWT_EXPIRES_IN;
  try {
    assert.equal(getJwtExpiry(), DEFAULT_JWT_EXPIRES_IN);
  } finally {
    if (previousExpiry !== undefined) process.env.JWT_EXPIRES_IN = previousExpiry;
  }
});

test("expired session tokens are rejected", () => {
  const token = jwt.sign(
    { id: "user-123", sessionVersion: 0 },
    "test-secret",
    { expiresIn: -1 }
  );

  assert.throws(() => jwt.verify(token, "test-secret"), /expired/i);
});

test("session version revokes previously issued tokens", () => {
  assert.equal(isSessionCurrent({ sessionVersion: 2 }, { sessionVersion: 2 }), true);
  assert.equal(isSessionCurrent({ sessionVersion: 2 }, { sessionVersion: 3 }), false);
  assert.equal(isSessionCurrent({}, { sessionVersion: 0 }), false);
  assert.equal(isSessionCurrent({ sessionVersion: 0 }, null), false);
});

test("rejects missing required security configuration", () => {
  assert.throws(
    () => validateSecurityConfiguration({ NODE_ENV: "production" }),
    /JWT_SECRET, MONGO_URI, GROQ_API_KEY/
  );
});

test("requires a strong production JWT secret", () => {
  assert.throws(
    () => validateSecurityConfiguration({
      NODE_ENV: "production",
      JWT_SECRET: "too-short",
      MONGO_URI: "mongodb://database/app",
      GROQ_API_KEY: "provider-key"
    }),
    /at least 32 characters/
  );
});

test("accepts complete production security configuration", () => {
  assert.doesNotThrow(() => validateSecurityConfiguration({
    NODE_ENV: "production",
    JWT_SECRET: "a-secure-production-secret-of-32-characters",
    MONGO_URI: "mongodb://database/app",
    GROQ_API_KEY: "provider-key"
  }));
});
