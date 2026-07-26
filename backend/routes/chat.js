import express from "express";
import Groq from "groq-sdk";
import fetch from "node-fetch";
import User from "../models/User.js";
import requireAuth from "../middleware/RequireAuth.js";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = (user, clinics = "", hasLocation = false) => `
You are CuraLink AI - a healthcare assistant with REAL access to nearby clinics when provided.

User: ${user.name}

${hasLocation ? `
LOCATION ACCESS: GRANTED.
These are the user's REAL nearby hospitals & clinics.
YOU MUST USE THESE.
DO NOT suggest Google search.
DO NOT say you lack location.

${clinics}
` : `
LOCATION ACCESS: NOT GRANTED.
If the user asks for doctors, hospitals or clinics, you MUST ask:
"May I access your location to find nearby hospitals?"
`}

Rules:
- If hasLocation=true, NEVER say you don't know the location.
- If hasLocation=false, ALWAYS ask permission.
- List only real hospitals when available.
`;

const fetchNearbyClinics = async (lat, lng) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&keyword=hospital|clinic|doctor&key=${process.env.GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return (data.results || [])
      .slice(0, 5)
      .map(place => `- ${place.name} - https://www.google.com/maps/place/?q=place_id:${place.place_id}`)
      .join("\n");
  } catch {
    return "";
  }
};

router.post("/title", async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Create a short healthcare chat title (3-6 words). Return only the title." },
        { role: "user", content: req.body.text || "Health Consultation" }
      ],
      temperature: 0.7,
      max_tokens: 20
    });

    res.json({ title: completion.choices[0].message.content.trim() });
  } catch {
    res.json({ title: "Health Consultation" });
  }
});

router.post("/chat-stream", requireAuth, async (req, res) => {
  try {
    if (!Array.isArray(req.body.messages) || req.body.messages.length === 0) {
      return res.status(400).json({ message: "Messages are required" });
    }

    const user = await User.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let clinics = "";
    if (req.body.location?.lat && req.body.location?.lng) {
      clinics = await fetchNearbyClinics(req.body.location.lat, req.body.location.lng);
    }

    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT(user, clinics, Boolean(req.body.location)) },
        ...req.body.messages
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        res.write(`data: ${token}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to generate chat response" });
    }

    res.write("data: [ERROR]\n\n");
    res.end();
  }
});

export default router;
