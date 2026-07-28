const NEGATION_WINDOW = 28;

const EMERGENCY_RULES = [
  {
    category: "self-harm",
    patterns: [
      /\b(?:kill|hurt|harm)\s+myself\b/i,
      /\b(?:end|take)\s+my\s+(?:own\s+)?life\b/i,
      /\b(?:want|wish|plan(?:ning)?)\s+to\s+die\b/i,
      /\b(?:suicidal|suicide)\b/i,
      /\bno\s+reason\s+to\s+live\b/i
    ]
  },
  {
    category: "unconsciousness",
    patterns: [
      /\b(?:unconscious|unresponsive)\b/i,
      /\b(?:cannot|can't|couldn't|won't)\s+(?:wake|waken)\b/i,
      /\bnot\s+(?:waking|breathing)\b/i,
      /\bpassed\s+out\s+and\s+(?:won't|will\s+not|isn't)\s+wake/i
    ]
  },
  {
    category: "breathing",
    patterns: [
      /\b(?:cannot|can't|can\s+not|unable\s+to)\s+breathe\b/i,
      /\b(?:struggling|gasping)\s+(?:to|for)\s+(?:breathe|breath)\b/i,
      /\bsevere\s+(?:difficulty|trouble|shortness\s+of\s+breath)\s+(?:breathing)?\b/i,
      /\b(?:lips|face)\s+(?:are|is|turning|turned)\s+blue\b/i,
      /\bchoking\b/i
    ]
  },
  {
    category: "stroke",
    patterns: [
      /\b(?:face|facial)\s+droop(?:ing)?\b/i,
      /\b(?:sudden|new)\s+(?:one[- ]sided\s+)?(?:weakness|numbness)\b/i,
      /\b(?:sudden|new)\s+(?:slurred\s+speech|trouble\s+speaking|difficulty\s+speaking)\b/i,
      /\bone\s+side\s+(?:of\s+(?:my|the)\s+body\s+)?(?:is\s+)?(?:weak|numb|paralyzed)\b/i,
      /\b(?:having|signs?\s+of)\s+(?:a\s+)?stroke\b/i
    ]
  },
  {
    category: "chest-pain",
    patterns: [
      /\b(?:severe|crushing|sudden|new)\s+chest\s+(?:pain|pressure|tightness)\b/i,
      /\bchest\s+(?:pain|pressure|tightness)\s+(?:with|and)\s+(?:sweating|nausea|breathlessness|shortness\s+of\s+breath)\b/i,
      /\b(?:having|experiencing|i\s+have|i've\s+got)\s+chest\s+(?:pain|pressure|tightness)\b/i,
      /\b(?:having|signs?\s+of)\s+(?:a\s+)?heart\s+attack\b/i
    ]
  },
  {
    category: "bleeding",
    patterns: [
      /\b(?:severe|heavy|uncontrolled|uncontrollable)\s+bleeding\b/i,
      /\bbleeding\s+(?:that\s+)?(?:will\s+not|won't|doesn't)\s+stop\b/i,
      /\blost|losing\s+(?:a\s+)?lot\s+of\s+blood\b/i
    ]
  },
  {
    category: "overdose-or-poisoning",
    patterns: [
      /\b(?:i|we|they|he|she|someone)\s+(?:have\s+|has\s+)?overdosed\b/i,
      /\b(?:took|swallowed|ate|drank)\s+(?:too\s+many|a\s+whole|an\s+entire)\s+(?:pills?|tablets?|bottle)\b/i,
      /\b(?:swallowed|drank|ingested)\s+(?:poison|bleach|pesticide|cleaning\s+fluid)\b/i,
      /\bintentional\s+overdose\b/i
    ]
  },
  {
    category: "seizure",
    patterns: [
      /\bseizure\s+(?:lasting|for)\s+(?:more\s+than|over)\s+5\s+minutes\b/i,
      /\bfirst\s+(?:ever\s+)?seizure\b/i,
      /\b(?:seizure|convulsion)\s+and\s+(?:not|isn't)\s+waking\b/i
    ]
  },
  {
    category: "severe-allergic-reaction",
    patterns: [
      /\b(?:throat|tongue)\s+(?:is\s+)?swelling\b/i,
      /\bsevere\s+allergic\s+reaction\b/i,
      /\banaphylaxis\b/i
    ]
  }
];

function isNegated(text, matchIndex) {
  const prefix = text.slice(Math.max(0, matchIndex - NEGATION_WINDOW), matchIndex);
  return /\b(?:no|not|never|without|don't|do\s+not|didn't|did\s+not|isn't|is\s+not|wasn't|was\s+not)\b[^.!?]*$/i.test(prefix);
}

function emergencyResponse(category) {
  if (category === "self-harm") {
    return [
      "Your safety is the priority.",
      "If you may act on these thoughts now, have already harmed yourself, or cannot stay safe, contact your local emergency services or go to the nearest emergency department now.",
      "Do not stay alone: tell a trusted person nearby exactly what is happening and ask them to stay with you.",
      "Move away from anything you could use to hurt yourself if you can do so safely.",
      "If the danger is not immediate, contact a local crisis service or qualified mental-health professional now."
    ].join(" ");
  }

  const categoryAdvice = {
    "overdose-or-poisoning": "Do not induce vomiting or take food, drink, or medicine unless emergency professionals instruct you to.",
    bleeding: "If possible, apply firm continuous pressure to the bleeding area with a clean cloth while help is coming.",
    stroke: "Note when the symptoms started and do not wait to see whether they improve.",
    seizure: "Keep the person away from hazards, do not restrain them, and do not put anything in their mouth.",
    unconsciousness: "If the person is not breathing normally, follow the emergency dispatcher's CPR instructions.",
    "severe-allergic-reaction": "Use a prescribed epinephrine auto-injector if one is available, then still seek emergency help."
  }[category];

  return [
    "This may be a medical emergency.",
    "Contact your local emergency services now or have someone nearby call for you.",
    "Do not drive yourself; follow the emergency dispatcher's instructions.",
    categoryAdvice,
    "I cannot assess or safely manage this situation through chat."
  ].filter(Boolean).join(" ");
}

export function detectEmergency(text) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return null;

  for (const rule of EMERGENCY_RULES) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(normalizedText);
      if (match && !isNegated(normalizedText, match.index)) {
        return {
          category: rule.category,
          response: emergencyResponse(rule.category)
        };
      }
    }
  }

  return null;
}

