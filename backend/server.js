import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import { validateSecurityConfiguration } from "./services/sessionSecurity.js";

validateSecurityConfiguration();

const app = express();
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000"
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use((err, req, res, next) => {
  console.error("Request failed", {
    name: err?.name || "Error",
    status: err?.status || 500,
    method: req.method,
    path: req.path
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
