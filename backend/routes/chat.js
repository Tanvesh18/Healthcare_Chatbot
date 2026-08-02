import express from "express";
import Groq from "groq-sdk";
import fetch from "node-fetch";
import User from "../models/User.js";
import requireAuth from "../middleware/RequireAuth.js";
import { detectEmergency } from "../services/emergencyTriage.js";
import { getChatPrivacyState } from "../services/privacyConsents.js";
import { buildSystemPrompt } from "../services/systemPrompt.js";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const NEARBY_SEARCH_RADIUS_METERS = 5000;
const MAX_NEARBY_DISTANCE_KM = NEARBY_SEARCH_RADIUS_METERS / 1000;
const LOCATION_PROVIDER_TIMEOUT_MS = 8000;
const OVERPASS_ENDPOINTS = (process.env.OVERPASS_ENDPOINTS || [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter"
].join(","))
  .split(",")
  .map(endpoint => endpoint.trim())
  .filter(Boolean);
const NOMINATIM_ENDPOINT =
  process.env.NOMINATIM_ENDPOINT || "https://nominatim.openstreetmap.org/search";
const NEARBY_LOOKUP_UNAVAILABLE_RESPONSE =
  "I received your location, but the nearby-care provider is temporarily unavailable. Please retry in a moment or use a trusted mapping service to search for hospitals or emergency clinics near you. If this is an emergency, call your local emergency number now.";
const NO_NEARBY_RESULTS_RESPONSE =
  `I received your location, but OpenStreetMap returned no verified hospitals, clinics, doctors, or pharmacies within ${MAX_NEARBY_DISTANCE_KM} km. Try a broader search in a trusted mapping service. If this is an emergency, call your local emergency number now.`;

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
    "[out:json][timeout:7];",
    "(",
    `nwr(around:${NEARBY_SEARCH_RADIUS_METERS},${lat},${lng})["amenity"~"^(hospital|clinic|doctors|pharmacy)$"];`,
    `nwr(around:${NEARBY_SEARCH_RADIUS_METERS},${lat},${lng})["healthcare"~"^(hospital|clinic|doctor|centre|emergency|pharmacy)$"];`,
    ");",
    "out center 15;"
  ].join("\n");

  let data = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOCATION_PROVIDER_TIMEOUT_MS);

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

      console.warn("OpenStreetMap lookup failed:", new URL(endpoint).hostname, res.status);
    } catch (error) {
      console.warn(
        "OpenStreetMap lookup failed:",
        new URL(endpoint).hostname,
        error.name === "AbortError" ? "timeout" : "request-error"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!data) return { status: "unavailable", clinics: "" };

  const origin = { lat, lng };

  const clinics = (data.elements || [])
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

  return { status: "success", clinics };
};

const fetchNominatimNearbyClinics = async (lat, lng) => {
  const latitudeDelta = MAX_NEARBY_DISTANCE_KM / 111;
  const longitudeScale = Math.max(Math.cos(lat * Math.PI / 180), 0.1);
  const longitudeDelta = MAX_NEARBY_DISTANCE_KM / (111 * longitudeScale);
  const viewbox = [
    lng - longitudeDelta,
    lat + latitudeDelta,
    lng + longitudeDelta,
    lat - latitudeDelta
  ].join(",");
  const url = new URL(NOMINATIM_ENDPOINT);
  url.search = new URLSearchParams({
    format: "jsonv2",
    q: "[hospital]",
    viewbox,
    bounded: "1",
    layer: "poi",
    limit: "10"
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCATION_PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "CuraLinkAI/1.0"
      }
    });

    if (!response.ok) {
      console.warn("OpenStreetMap fallback failed:", url.hostname, response.status);
      return { status: "unavailable", clinics: "" };
    }

    const data = await response.json();
    const origin = { lat, lng };
    const clinics = (Array.isArray(data) ? data : [])
      .map(place => ({
        name: place.name || String(place.display_name || "").split(",")[0],
        lat: toNumber(place.lat),
        lng: toNumber(place.lon)
      }))
      .filter(place => place.name && place.lat !== null && place.lng !== null)
      .map(place => ({
        ...place,
        distance: distanceKm(origin, place)
      }))
      .filter(place => place.distance <= MAX_NEARBY_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(place => formatClinic(place.name, place.lat, place.lng, place.distance))
      .join("\n");

    return { status: "success", clinics };
  } catch (error) {
    console.warn(
      "OpenStreetMap fallback failed:",
      url.hostname,
      error.name === "AbortError" ? "timeout" : "request-error"
    );
    return { status: "unavailable", clinics: "" };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchNearbyClinics = async (lat, lng) => {
  try {
    const overpassResult = await fetchOpenStreetMapNearbyClinics(lat, lng);
    if (overpassResult.status === "success") {
      return overpassResult;
    }

    return await fetchNominatimNearbyClinics(lat, lng);
  } catch {
    console.warn("Nearby clinic lookup failed");
    return { status: "unavailable", clinics: "" };
  }
};

const writeCompletedResponse = (res, message) => {
  writeSseData(res, message);
  res.write("data: [DONE]\n\n");
  res.end();
};

const writeSseData = (res, value) => {
  for (const line of String(value).split(/\r?\n/)) {
    res.write(`data: ${line}\n`);
  }
  res.write("\n");
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

    const locationRequested = req.body.location !== undefined && req.body.location !== null;
    const privacyState = getChatPrivacyState(user, locationRequested);
    if (privacyState.locationConsentRequired) {
      return res.status(403).json({
        code: "LOCATION_CONSENT_REQUIRED",
        message: "Enable nearby-care search in Privacy Settings before sharing your location."
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const latestUserMessage = [...req.body.messages]
      .reverse()
      .find(message => message?.role === "user" && typeof message.content === "string");
    const emergency = detectEmergency(latestUserMessage?.content);

    if (emergency) {
      return writeCompletedResponse(res, emergency.response);
    }

    const location = normalizeLocation(req.body.location);
    let clinics = "";
    if (location) {
      const nearbyLookup = await fetchNearbyClinics(location.lat, location.lng);
      if (nearbyLookup.status === "unavailable") {
        return writeCompletedResponse(res, NEARBY_LOOKUP_UNAVAILABLE_RESPONSE);
      }

      clinics = nearbyLookup.clinics;
      if (!clinics) {
        return writeCompletedResponse(res, NO_NEARBY_RESULTS_RESPONSE);
      }
    }

    const stream = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(user, clinics, Boolean(location)) },
        ...req.body.messages
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        writeSseData(res, token);
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
