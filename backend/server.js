import "dotenv/config";          // 🔥 MUST be first
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import locationRoutes from "./routes/location.js";

console.log("Groq key loaded:", !!process.env.GROQ_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/location", locationRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));
