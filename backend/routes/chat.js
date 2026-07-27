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

${clinics || "No nearby hospitals or clinics were found from the location lookup."}
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

const formatClinic = (name, lat, lng) => {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return `- ${name} - ${mapsUrl}`;
};

const fetchGoogleNearbyClinics = async (lat, lng) => {
  if (!process.env.GOOGLE_API_KEY) return "";

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: "3000",
    keyword: "hospital|clinic|doctor",
    key: process.env.GOOGLE_API_KEY
  });
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status && !["OK", "ZERO_RESULTS"].includes(data.status)) {
    console.warn("Google Places lookup failed:", data.status, data.error_message || "");
  }

  return (data.results || [])
    .slice(0, 5)
    .map(place => {
      const placeLat = place.geometry?.location?.lat;
      const placeLng = place.geometry?.location?.lng;
      const mapsUrl = place.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
        : `https://www.google.com/maps/search/?api=1&query=${placeLat},${placeLng}`;

      return `- ${place.name} - ${mapsUrl}`;
    })
    .join("\n");
};

const fetchOpenStreetMapNearbyClinics = async (lat, lng) => {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"~"hospital|clinic|doctors"](around:3000,${lat},${lng});
      way["amenity"~"hospital|clinic|doctors"](around:3000,${lat},${lng});
      relation["amenity"~"hospital|clinic|doctors"](around:3000,${lat},${lng});
    );
    out center 8;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query })
  });

  if (!res.ok) {
    console.warn("OpenStreetMap lookup failed:", res.status, res.statusText);
    return "";
  }

  const data = await res.json();

  return (data.elements || [])
    .map(place => ({
      name: place.tags?.name || place.tags?.["name:en"] || place.tags?.amenity,
      lat: place.lat ?? place.center?.lat,
      lng: place.lon ?? place.center?.lon
    }))
    .filter(place => place.name && place.lat && place.lng)
    .slice(0, 5)
    .map(place => formatClinic(place.name, place.lat, place.lng))
    .join("\n");
};

const fetchNearbyClinics = async (lat, lng) => {
  try {
    const googleClinics = await fetchGoogleNearbyClinics(lat, lng);
    if (googleClinics) return googleClinics;

    return await fetchOpenStreetMapNearbyClinics(lat, lng);
  } catch (error) {
    console.warn("Nearby clinic lookup failed:", error.message);
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
