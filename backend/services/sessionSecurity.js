import jwt from "jsonwebtoken";

export const DEFAULT_JWT_EXPIRES_IN = "1h";

export function getJwtExpiry() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

export function signSessionToken(user) {
  return jwt.sign(
    {
      id: user._id,
      sessionVersion: user.sessionVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: getJwtExpiry() }
  );
}

export function isSessionCurrent(payload, user) {
  return Boolean(user) &&
    Number.isInteger(payload?.sessionVersion) &&
    payload.sessionVersion === (user.sessionVersion || 0);
}

export function validateSecurityConfiguration(env = process.env) {
  const missing = ["JWT_SECRET", "MONGO_URI", "GROQ_API_KEY"]
    .filter(name => !String(env[name] || "").trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (env.NODE_ENV === "production" && String(env.JWT_SECRET).length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters in production");
  }
}
