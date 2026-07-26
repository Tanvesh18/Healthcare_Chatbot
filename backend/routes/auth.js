import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import requireAuth from "../middleware/RequireAuth.js";

const router = express.Router();

const PROFILE_FIELDS = [
  "age",
  "height",
  "weight",
  "gender",
  "bloodGroup",
  "conditions",
  "allergies",
  "smoking",
  "alcohol",
  "activityLevel"
];

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
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
  update.smoking = parseEnum(body.smoking, "smoking", ["yes", "no", "occasionally"]);
  update.alcohol = parseEnum(body.alcohol, "alcohol", ["yes", "no", "occasionally"]);
  update.activityLevel = parseEnum(body.activityLevel, "activityLevel", ["low", "moderate", "high"]);

  return Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined)
  );
}

router.post("/signup", async (req, res, next) => {
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

    res.json({ token: jwt.sign({ id: user._id }, process.env.JWT_SECRET) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    if (!req.body.email?.trim() || !req.body.password) {
      throw badRequest("Email and password are required");
    }

    const user = await User.findOne({ email: req.body.email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({ token: jwt.sign({ id: user._id }, process.env.JWT_SECRET) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
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
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
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
