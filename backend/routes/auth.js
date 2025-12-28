import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

const auth = (req) => jwt.verify(req.headers.authorization, process.env.JWT_SECRET);

/* ---------- AUTH ---------- */

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email }))
    return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });

  res.json({ token: jwt.sign({ id: user._id }, process.env.JWT_SECRET) });
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.status(400).json({ message: "Invalid credentials" });

  res.json({ token: jwt.sign({ id: user._id }, process.env.JWT_SECRET) });
});

router.get("/me", async (req, res) => {
  const decoded = auth(req);
  res.json(await User.findById(decoded.id).select("-password"));
});

/* ---------- HEALTH PROFILE ---------- */

router.put("/profile", async (req, res) => {
  const decoded = auth(req);

  const user = await User.findByIdAndUpdate(decoded.id, req.body, { new: true });
  res.json(user);
});

/* ---------- CHAT SYSTEM ---------- */

// Create new empty chat
router.post("/save", async (req, res) => {
  const decoded = auth(req);
  const user = await User.findById(decoded.id);

  user.chats.push(req.body);
  await user.save();

  res.json(user.chats[user.chats.length - 1]);   // return new chat
});

// Update existing chat
router.put("/chat/:id", async (req, res) => {
  const decoded = auth(req);

  const user = await User.findOneAndUpdate(
    { _id: decoded.id, "chats._id": req.params.id },
    {
      $set: {
        "chats.$.messages": req.body.messages,
        "chats.$.title": req.body.title
      }
    },
    { new: true }
  );

  res.json(user.chats.find(c => c._id == req.params.id));
});

// Get history
router.get("/history", async (req, res) => {
  const decoded = auth(req);
  const user = await User.findById(decoded.id);
  res.json(user.chats);
});

// Delete chat
router.delete("/chat/:id", async (req, res) => {
  const decoded = auth(req);

  await User.findByIdAndUpdate(decoded.id, {
    $pull: { chats: { _id: req.params.id } }
  });

  res.json({ success: true });
});

export default router;
