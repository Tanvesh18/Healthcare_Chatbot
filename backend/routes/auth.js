import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import requireAuth from "../middleware/RequireAuth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import {
  normalizeAdverseReactions,
  normalizeMedications
} from "../services/medicationProfile.js";
import {
  buildConsentRecord,
  getPrivacyConsents
} from "../services/privacyConsents.js";
import { signSessionToken } from "../services/sessionSecurity.js";

const router = express.Router();
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
let googleJwksCache = {
  expiresAt: 0,
  keys: []
};

const PROFILE_FIELDS = [
  "age",
  "height",
  "weight",
  "gender",
  "bloodGroup",
  "conditions",
  "allergies",
  "medications",
  "adverseReactions",
  "smoking",
  "alcohol",
  "activityLevel"
];
const PRIVACY_CONSENT_FIELDS = [
  "aiProfilePersonalization",
  "locationCareSearch"
];

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseMaxAge(cacheControl) {
  const match = cacheControl?.match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url");
}

function parseJwt(credential) {
  const parts = String(credential || "").split(".");
  if (parts.length !== 3) {
    throw badRequest("Invalid Google credential format");
  }

  try {
    return {
      encodedHeader: parts[0],
      encodedPayload: parts[1],
      signature: parts[2],
      header: JSON.parse(decodeBase64Url(parts[0]).toString("utf8")),
      payload: JSON.parse(decodeBase64Url(parts[1]).toString("utf8"))
    };
  } catch {
    throw badRequest("Invalid Google credential format");
  }
}

async function getGoogleJwks() {
  if (googleJwksCache.expiresAt > Date.now() && googleJwksCache.keys.length > 0) {
    return googleJwksCache.keys;
  }

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) {
    const error = new Error("Unable to fetch Google signing keys");
    error.status = 503;
    throw error;
  }

  const data = await response.json();
  googleJwksCache = {
    keys: Array.isArray(data.keys) ? data.keys : [],
    expiresAt: Date.now() + parseMaxAge(response.headers.get("cache-control")) * 1000
  };

  return googleJwksCache.keys;
}

async function verifyGoogleCredential(credential) {
  const { encodedHeader, encodedPayload, signature, header, payload } = parseJwt(credential);

  if (header.alg !== "RS256" || !header.kid) {
    throw badRequest("Unsupported Google credential");
  }

  const keys = await getGoogleJwks();
  const jwk = keys.find(key => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) {
    googleJwksCache.expiresAt = 0;
    const refreshedKeys = await getGoogleJwks();
    const refreshedKey = refreshedKeys.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!refreshedKey) {
      throw badRequest("Google signing key not found");
    }

    return verifyGoogleSignature(refreshedKey, encodedHeader, encodedPayload, signature, payload);
  }

  return verifyGoogleSignature(jwk, encodedHeader, encodedPayload, signature, payload);
}

function verifyGoogleSignature(jwk, encodedHeader, encodedPayload, signature, payload) {
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const isValid = verifier.verify(publicKey, decodeBase64Url(signature));
  if (!isValid) {
    throw badRequest("Invalid Google credential signature");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw badRequest("Google credential has expired");
  }

  if (payload.nbf && payload.nbf > now) {
    throw badRequest("Google credential is not active yet");
  }

  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw badRequest("Invalid Google credential issuer");
  }

  return payload;
}

function parsePositiveNumber(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw badRequest(`Invalid ${field}`);
  }

  return parsed;
}

function parseStringArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw badRequest(`${field} must be an array`);

  return value
    .map(item => String(item).trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseEnum(value, field, allowed) {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw badRequest(`Invalid ${field}`);
  }

  return normalized;
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw badRequest("Messages are required");
  }

  return messages.map(message => {
    const sender = String(message.sender || "").trim();
    const text = String(message.text || "").trim();

    if (!["user", "assistant"].includes(sender) || !text) {
      throw badRequest("Each message must include a valid sender and text");
    }

    return { sender, text };
  });
}

function buildProfileUpdate(body) {
  const update = {};

  update.age = parsePositiveNumber(body.age, "age", { min: 0, max: 130 });
  update.height = parsePositiveNumber(body.height, "height", { min: 30, max: 300 });
  update.weight = parsePositiveNumber(body.weight, "weight", { min: 1, max: 500 });
  update.gender = body.gender !== undefined ? String(body.gender).trim().slice(0, 32) : undefined;
  update.bloodGroup = body.bloodGroup !== undefined ? String(body.bloodGroup).trim().toUpperCase().slice(0, 8) : undefined;
  update.conditions = parseStringArray(body.conditions, "conditions");
  update.allergies = parseStringArray(body.allergies, "allergies");
  update.medications = normalizeMedications(body.medications);
  update.adverseReactions = normalizeAdverseReactions(body.adverseReactions);
  update.smoking = parseEnum(body.smoking, "smoking", ["yes", "no", "occasionally"]);
  update.alcohol = parseEnum(body.alcohol, "alcohol", ["yes", "no", "occasionally"]);
  update.activityLevel = parseEnum(body.activityLevel, "activityLevel", ["low", "moderate", "high"]);

  return Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined)
  );
}

function parsePrivacyConsentUpdate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Privacy consent preferences are required");
  }

  const fields = Object.keys(body);
  if (fields.length === 0) {
    throw badRequest("At least one privacy consent preference is required");
  }

  const disallowedField = fields.find(field => !PRIVACY_CONSENT_FIELDS.includes(field));
  if (disallowedField) {
    throw badRequest(`Field not allowed: ${disallowedField}`);
  }

  return Object.fromEntries(fields.map(field => {
    if (typeof body[field] !== "boolean") {
      throw badRequest(`${field} must be a boolean`);
    }

    return [field, body[field]];
  }));
}

function publicUser(user) {
  const { password, googleId, ...safeUser } = user.toObject ? user.toObject() : user;
  return safeUser;
}

router.post("/signup", authRateLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim()) throw badRequest("Name is required");
    if (!email?.trim()) throw badRequest("Email is required");
    if (!password || password.length < 6) throw badRequest("Password must be at least 6 characters");

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed
    });

    res.json({ token: signSessionToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    if (!req.body.email?.trim() || !req.body.password) {
      throw badRequest("Email and password are required");
    }

    const user = await User.findOne({ email: req.body.email.trim().toLowerCase() })
      .select("+sessionVersion");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google." });
    }

    if (!(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({ token: signSessionToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/google", authRateLimiter, async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      throw badRequest("Google credential is required");
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      const error = new Error("Google sign-in is not configured on the server");
      error.status = 500;
      throw error;
    }

    const payload = await verifyGoogleCredential(credential);

    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: "Google credential audience mismatch" });
    }

    if (String(payload.email_verified) !== "true" || !payload.email?.trim()) {
      return res.status(400).json({ message: "Google account email is not verified" });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail }).select("+sessionVersion");

    if (!user) {
      user = await User.create({
        name: payload.name?.trim() || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: payload.sub,
        avatarUrl: payload.picture
      });
    } else {
      let shouldSave = false;

      if (!user.googleId) {
        user.googleId = payload.sub;
        shouldSave = true;
      }

      if (payload.picture && user.avatarUrl !== payload.picture) {
        user.avatarUrl = payload.picture;
        shouldSave = true;
      }

      if ((!user.name || user.name === normalizedEmail) && payload.name?.trim()) {
        user.name = payload.name.trim();
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }

    res.json({ token: signSessionToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id).select("-password -googleId");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.auth.id, { $inc: { sessionVersion: 1 } });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const disallowedField = Object.keys(req.body).find(key => !PROFILE_FIELDS.includes(key));
    if (disallowedField) {
      throw badRequest(`Field not allowed: ${disallowedField}`);
    }

    const user = await User.findByIdAndUpdate(req.auth.id, buildProfileUpdate(req.body), {
      new: true,
      runValidators: true
    }).select("-password -googleId");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch("/privacy-consents", requireAuth, async (req, res, next) => {
  try {
    const preferences = parsePrivacyConsentUpdate(req.body);
    const user = await User.findById(req.auth.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    const now = new Date();
    for (const [field, enabled] of Object.entries(preferences)) {
      if (user.privacyConsents?.[field]?.enabled !== enabled) {
        user.set(`privacyConsents.${field}`, buildConsentRecord(enabled, now));
      }
    }
    await user.save();

    user.password = undefined;
    user.googleId = undefined;
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/data-export", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const healthProfile = Object.fromEntries(
      PROFILE_FIELDS.map(field => [field, user[field]])
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", "attachment; filename=\"curalink-data-export.json\"");
    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      account: {
        id: String(user._id),
        name: user.name,
        email: user.email
      },
      healthProfile,
      privacyConsents: getPrivacyConsents(user),
      chats: user.chats
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/data", requireAuth, async (req, res, next) => {
  try {
    if (req.body?.confirm !== "DELETE") {
      throw badRequest("Type DELETE to confirm data deletion");
    }

    const unsetProfile = Object.fromEntries([
      ...PROFILE_FIELDS,
      "privacyConsents"
    ].map(field => [field, 1]));
    const user = await User.findByIdAndUpdate(
      req.auth.id,
      {
        $unset: unsetProfile,
        $set: { chats: [] }
      },
      { new: true, runValidators: true }
    ).select("-password -googleId");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/save", requireAuth, async (req, res, next) => {
  try {
    const { title, messages } = req.body;

    if (!title?.trim()) throw badRequest("Chat title is required");

    const user = await User.findById(req.auth.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.chats.push({
      title: title.trim().slice(0, 120),
      messages: normalizeMessages(messages)
    });
    await user.save();

    res.json(user.chats[user.chats.length - 1]);
  } catch (error) {
    next(error);
  }
});

router.put("/chat/:id", requireAuth, async (req, res, next) => {
  try {
    const update = {};

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim().slice(0, 120);
      if (!title) throw badRequest("Chat title cannot be empty");
      update["chats.$.title"] = title;
    }

    if (req.body.messages !== undefined) {
      update["chats.$.messages"] = normalizeMessages(req.body.messages);
    }

    if (Object.keys(update).length === 0) {
      throw badRequest("No chat fields provided");
    }

    const user = await User.findOneAndUpdate(
      { _id: req.auth.id, "chats._id": req.params.id },
      update,
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "Chat not found" });
    res.json(user.chats.find(chat => String(chat._id) === req.params.id));
  } catch (error) {
    next(error);
  }
});

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json([...user.chats].reverse());
  } catch (error) {
    next(error);
  }
});

router.delete("/chat/:id", requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.auth.id, {
      $pull: { chats: { _id: req.params.id } }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
