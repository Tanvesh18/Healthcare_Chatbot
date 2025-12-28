import express from "express";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";
import User from "../models/User.js";
import fetch from "node-fetch";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = (user, clinics = "") => `
You are TechFiesta AI, a healthcare assistant chatbot.

User profile:
Name: ${user.name}
Age: ${user.age || "unknown"}
Height: ${user.height || "unknown"} cm
Weight: ${user.weight || "unknown"} kg

${clinics && `Nearby hospitals & clinics:\n${clinics}`}

Rules:
- Greet the user by name.
- Ask about symptoms politely.
- Give possible causes, not diagnosis.
- Suggest home remedies & lifestyle advice.
- Never prescribe medicine or dosages.
- Recommend seeing a doctor if symptoms are severe.
`;

// 🔍 Fetch clinics from OpenStreetMap (FREE)
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];

const fetchNearbyClinics = async (lat, lng) => {
  const query = `
  [out:json][timeout:25];
  (
    node["amenity"="hospital"](around:3000,${lat},${lng});
    node["amenity"="clinic"](around:3000,${lat},${lng});
  );
  out body 10;
  `;

  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetch(server, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query)
      });

      const text = await res.text();

      if (!text.startsWith("{")) continue;

      const data = JSON.parse(text);

      return data.elements.slice(0, 5).map(p =>
        `• ${p.tags.name || "Medical Center"} – https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`
      ).join("\n");

    } catch (e) {
      continue;
    }
  }

  return "";
};



// 🟢 Chat endpoint
router.post("/", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ text: "Authentication required." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ text: "User not found." });

    let clinics = "";

    if (req.body.location) {
      clinics = await fetchNearbyClinics(req.body.location.lat, req.body.location.lng);
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT(user, clinics) },
        ...req.body.messages
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    res.json({ text: raw || "Please describe your symptoms." });

  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ text: "Groq error: " + err.message });
  }
});

export default router;
