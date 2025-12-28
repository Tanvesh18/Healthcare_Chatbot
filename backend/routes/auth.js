import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({ name, email, password: hashed });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token });
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(req.body.password, user.password);
  if (!ok) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token });
});

router.get("/me", async (req, res) => {
  const decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");
  res.json(user);
});

router.put("/profile", async (req, res) => {
  const decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
  const user = await User.findByIdAndUpdate(decoded.id, req.body, { new: true });
  res.json(user);
});

router.post("/save", async (req, res) => {
  try {
    const decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    user.chats.push(req.body);
    await user.save();

    res.json({ message: "Chat saved" });
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    res.json(user.chats);
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
});

export default router;

