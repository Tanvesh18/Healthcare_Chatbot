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
Gender: ${user.gender || "unknown"}
Blood Group: ${user.bloodGroup || "unknown"}
Known Conditions: ${(user.conditions || []).join(", ") || "none"}
Allergies: ${(user.allergies || []).join(", ") || "none"}
Smoking: ${user.smoking || "unknown"}
Alcohol: ${user.alcohol || "unknown"}
Activity Level: ${user.activityLevel || "unknown"}

${clinics && `Nearby hospitals & clinics:\n${clinics}`}

Rules:
- Greet the user by name.
- Ask about symptoms politely.
- Give possible causes, not diagnosis.
- Suggest home remedies & lifestyle advice.
- Never prescribe medicine or dosages.
- Recommend seeing a doctor if symptoms are severe.
- If the user asks about nearby doctors, hospitals, or clinics, ALWAYS mention the nearby facilities listed above with their Google Maps links.
- When location data is provided, prioritize suggesting the nearby facilities from the list.
- IMPORTANT FORMATTING: When listing items (hospitals, symptoms, remedies, characteristics, etc.), ALWAYS use markdown bullet point format with dashes (-) or asterisks (*), NOT the bullet symbol (•). Use proper markdown format: "- Item 1\n- Item 2\n- Item 3" or "* Item 1\n* Item 2\n* Item 3". Each item must be on a new line.
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
        `- ${p.tags.name || "Medical Center"} – https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`
      ).join("\n");

    } catch (e) {
      continue;
    }
  }

  return "";
};

// 🏷 Generate creative chat title
router.post("/title", async (req, res) => {
  try {
    const userMessage = req.body.text || "Health consultation";
    console.log("Generating title for:", userMessage);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a creative title generator for healthcare conversations. 
Create a short, catchy, and descriptive title (3-6 words) based on the user's first message.
Make it specific to their symptoms or health concern. 
Examples: "Headache & Migraine Help", "Chest Pain Consultation", "Skin Rash Inquiry", "Fever & Fatigue Check"
Return ONLY the title, no quotes, no explanations, no extra text.`
        },
        {
          role: "user",
          content: `User's first message: "${userMessage}"`
        }
      ],
      temperature: 0.8,
      max_tokens: 25
    });

    let title = completion.choices[0]?.message?.content?.trim();
    
    // Clean up the title - remove quotes, extra whitespace, and explanations
    title = title.replace(/^["']|["']$/g, "").replace(/\n.*$/g, "").trim();
    
    // Fallback if title is too long or empty
    if (!title || title.length > 50 || title.length < 3) {
      console.log("Title too long/short, using fallback");
      // Extract key words from the message
      const words = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 3);
      title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Consultation";
    }

    console.log("Generated title:", title);
    res.json({ title });
  } catch (err) {
    console.error("Title generation error:", err);
    // Fallback: create title from first few words
    const userMessage = req.body.text || "Health";
    const words = userMessage.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
    const fallback = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Consultation";
    console.log("Using fallback title:", fallback);
    res.json({ title: fallback });
  }
});


// 🟢 Streaming Chat endpoint
router.post("/chat-stream", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ text: "Authentication required." });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ text: "User not found." });
      return;
    }

    // Set headers for SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let clinics = "";
    if (req.body.location) {
      clinics = await fetchNearbyClinics(req.body.location.lat, req.body.location.lng);
    }

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT(user, clinics) },
        ...req.body.messages
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${content}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.error("Groq streaming error:", err);
    if (!res.headersSent) {
      res.status(500).json({ text: "Sorry, I couldn't process that request. Please try again." });
    } else {
      res.write(`data: [ERROR]\n\n`);
      res.end();
    }
  }
});

// 🟢 Regular Chat endpoint (for compatibility)
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
