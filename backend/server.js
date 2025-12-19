import express from "express";
import cors from "cors";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* =========================================================
   SYSTEM PROMPTS
   ========================================================= */

const HEALTH_SYSTEM_PROMPT = `
You are a Public Health Awareness Chatbot.

STRICT OUTPUT RULES:
- ALL responses MUST be valid Markdown
- Use **bold headings**
- Headings must be on their own line
- Blank line before and after headings
- Bullet points must start with "- "
- NO inline lists
- NO long paragraphs

CONTENT RULES:
- DO NOT diagnose
- DO NOT prescribe medicines
- Be calm and supportive
- Advise seeing a doctor if serious

FORMAT:

**Overview:**

- Short explanation

**Possible Causes:**

- Cause one
- Cause two

**What You Can Do:**

- Action one
- Action two

**When to See a Doctor:**

- Warning sign one
- Warning sign two
`;

const GENERAL_SYSTEM_PROMPT = `
You are a calm, empathetic assistant.

RULES:
- Respond naturally
- Do NOT force medical formatting
- Be emotionally appropriate
- If user is distressed, prioritize safety
- NEVER encourage self-harm
`;

/* =========================================================
   HEALTH INTENT CHECK
   ========================================================= */
function isHealthRelated(text = "") {
  const keywords = [
    "fever", "cough", "pain", "headache", "vomit", "diarrhea",
    "sick", "ill", "infection", "symptom", "stomach", "cold",
    "flu", "nausea", "body ache"
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

/* =========================================================
   NORMAL CHAT
   ========================================================= */
app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages || [];

    if (!messages.length) {
      return res.json({ reply: "How can I help you today?" });
    }

    const lastUserMessage =
      messages.filter(m => m.role === "user").at(-1)?.content || "";

    const systemPrompt = isHealthRelated(lastUserMessage)
      ? HEALTH_SYSTEM_PROMPT
      : GENERAL_SYSTEM_PROMPT;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ reply: "Server error. Please try again." });
  }
});

/* =========================================================
   STREAMING CHAT (SAFE)
   ========================================================= */
app.post("/chat-stream", async (req, res) => {
  try {
    const messages = req.body.messages || [];

    const lastUserMessage =
      messages.filter(m => m.role === "user").at(-1)?.content || "";

    const systemPrompt = isHealthRelated(lastUserMessage)
      ? HEALTH_SYSTEM_PROMPT
      : GENERAL_SYSTEM_PROMPT;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ]
    });

    let sentAnything = false;

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token && token.trim()) {
        sentAnything = true;
        res.write(`data: ${token}\n\n`);
      }
    }

    if (!sentAnything) {
      res.write(
        "data: I'm here with you. Could you tell me a bit more?\n\n"
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Streaming error:", error);
    res.write("data: Something went wrong. Please try again.\n\n");
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
