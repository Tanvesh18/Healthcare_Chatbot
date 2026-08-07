import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isSessionCurrent } from "../services/sessionSecurity.js";

export default async function requireAuth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("+sessionVersion");

    if (!isSessionCurrent(payload, user)) {
      return res.status(401).json({ message: "Invalid or revoked session" });
    }

    req.auth = payload;
    req.authUser = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
