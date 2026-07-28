import express from "express";
import Groq from "groq-sdk";
import fetch from "node-fetch";
import User from "../models/User.js";
import requireAuth from "../middleware/RequireAuth.js";
import { buildHealthProfileContext } from "../services/healthProfileContext.js";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const NEARBY_SEARCH_RADIUS_METERS = 5000;
const MAX_NEARBY_DISTANCE_KM = NEARBY_SEARCH_RADIUS_METERS / 1000;
const OVERPASS_TIMEOUT_MS = 6000;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter"
];

const SYSTEM_PROMPT = (user, clinics = "", location = null) => `
You are CuraLink AI - a healthcare assistant with REAL access to nearby clinics when provided.

User: ${user.name}

${buildHealthProfileContext(user)}

${location ? `
LOCATION ACCESS: GRANTED.
User coordinates from browser geolocation: ${location.lat}, ${location.lng}

${clinics ? `These are the user's REAL nearby hospitals & clinics.
YOU MUST USE ONLY THESE RESULTS.
DO NOT suggest Google search.
DO NOT say you lack location.
DO NOT list hospitals from any other city or from memory.

${clinics}` : `The location lookup returned no verified nearby hospitals or clinics for these coordinates.
Tell the user that no verified nearby results were found and ask them to retry location access or search manually.
DO NOT invent hospital, clinic, doctor, or city names.`}
` : `
LOCATION ACCESS: NOT GRANTED.
If the user asks for doctors, hospitals or clinics, you MUST ask:
"May I access your location to find nearby hospitals?"
`}

Rules:
- If location is provided and clinic results are provided, list only those clinic results.
- If location is provided but clinic results are empty, do not list any hospitals.
- If location is not provided, ask permission before discussing nearby places.
`;

const toNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLocation = location => {
  const lat = toNumber(location?.lat);
  const lng = toNumber(location?.lng);
  const accuracy = toNumber(location?.accuracy);

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng, accuracy };
};

const distanceKm = (from, to) => {
  const toRadians = degrees => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

const formatClinic = (name, lat, lng, distance = null) => {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const distanceText = distance === null ? "" : ` (${distance.toFixed(1)} km away)`;
  return `- ${name}${distanceText} - ${mapsUrl}`;
};

const fetchOpenStreetMapNearbyClinics = async (lat, lng) => {
  const query = [
    "[out:json][timeout:8];",
    "(",
    `node["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](around:${NEARBY_SEARCH_RADIUS_METERS},${lat},${lng});`,
    `way["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](around:${NEARBY_SEARCH_RADIUS_METERS},${lat},${lng});`,
    `node["healthcare"~"^(hospital|clinic|doctor|centre|emergency|pharmacy)$"](around:${NEARBY_SEARCH_RADIUS_METERS},${lat},${lng});`,
    `way["healthcare"~"^(hospital|clinic|doctor|centre|emergency|pharmacy)$"](around:${NEARBY_SEARCH_RADIUS_METERS},${lat},${lng});`,
    ");",
    "out center 15;"
  ].join("\n");

  let data = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "CuraLinkAI/1.0"
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (res.ok) {
        data = await res.json();
        console.log("OpenStreetMap lookup:", endpoint, `${(data.elements || []).length} raw results`);
        break;
      }

      const errorText = await res.text().catch(() => "");
      console.warn(
        "OpenStreetMap lookup failed:",
        endpoint,
        res.status,
        res.statusText,
        errorText.slice(0, 180)
      );
    } catch (error) {
      console.warn("OpenStreetMap lookup failed:", endpoint, error.name === "AbortError" ? "timeout" : error.message);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!data) return "";

  const origin = { lat, lng };

  return (data.elements || [])
    .map(place => ({
      name: place.tags?.name || place.tags?.["name:en"] || place.tags?.amenity,
      lat: place.lat ?? place.center?.lat,
      lng: place.lon ?? place.center?.lon
    }))
    .map(place => ({
      ...place,
      lat: toNumber(place.lat),
      lng: toNumber(place.lng)
    }))
    .filter(place => place.name && place.lat !== null && place.lng !== null)
    .map(place => ({
      ...place,
      distance: distanceKm(origin, { lat: place.lat, lng: place.lng })
    }))
    .filter(place => place.distance <= MAX_NEARBY_DISTANCE_KM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(place => formatClinic(place.name, place.lat, place.lng, place.distance))
    .join("\n");
};

const fetchNearbyClinics = async (lat, lng) => {
  try {
    console.log("Nearby clinic lookup coordinates:", lat, lng);
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

    const location = normalizeLocation(req.body.location);
    let clinics = "";
    if (location) {
      console.log("Browser location accuracy:", location.accuracy === null ? "unknown" : `${Math.round(location.accuracy)}m`);
      clinics = await fetchNearbyClinics(location.lat, location.lng);
    }

    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT(user, clinics, location) },
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
