import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

/* ---------------- Env / defaults ---------------- */
const ACCESS_CODE = process.env.ACCESS_CODE || "FETHINK-LETTER-2";
const COOKIE_SECRET =
  process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_MINUTES = parseInt(process.env.SESSION_MINUTES || "120", 10);

const COURSE_BACK_URL = process.env.COURSE_BACK_URL || "";
const NEXT_LESSON_URL = process.env.NEXT_LESSON_URL || "";

app.use(cookieParser(COOKIE_SECRET));

/* ---------------- Session cookie helpers ---------------- */
const COOKIE_NAME = "fethink_email2_session";

function setSessionCookie(res) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_MINUTES * 60;
  const payload = { exp };

  res.cookie(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MINUTES * 60 * 1000,
    signed: true
  });
}

function isSessionValid(req) {
  const raw = req.signedCookies?.[COOKIE_NAME];
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);
    return (
      typeof payload?.exp === "number" &&
      Math.floor(Date.now() / 1000) < payload.exp
    );
  } catch {
    return false;
  }
}

function requireSession(req, res, next) {
  if (!isSessionValid(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  next();
}

/* ---------------- Helpers ---------------- */
function clampStr(s, max = 6000) {
  return String(s || "").slice(0, max);
}
function wordCount(text) {
  const t = String(text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
function hasAny(text, needles) {
  const t = String(text || "").toLowerCase();
  return needles.some((n) => t.includes(n));
}
function timingSafeEquals(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

/* ---------------- Task content ---------------- */
const QUESTION_TEXT = [
  "Scenario:",
  "You are an office worker in the events and partnerships team of a professional training organisation.",
  "Your manager has asked you to contact a long-standing customer and invite them to sponsor an exhibition stall at your annual training conference.",
  "",
  "Difficulties to consider:",
  "- The customer has a long relationship with your company but has not sponsored before.",
  "- They have recently mentioned budget pressures, so you need to be persuasive but tactful.",
  "- Time is limited — the exhibition prospectus is due for print next week, so the email must encourage a prompt response.",
  "",
  "=== TASK ===",
  "Write a prompt for yourself using the FEthink structure so AI can help you plan and structure the professional email.",
  "",
  "=== USE THE FEthink STRUCTURE ===",
  "ROLE: Who should the AI be?",
  "TASK: What should the AI help you write?",
  "CONTEXT: Who is the audience and what is the situation?",
  "FORMAT: How should the email be structured and what tone should it use?",
  "",
  "Aim for 20–300 words."
].join("\n");

const TEMPLATE_TEXT = ["Role:", "Task:", "Context (audience):", "Format (structure/tone):"].join("\n");

const MODEL_ANSWER = [
  "Role:",
  "Act as an experienced events coordinator who writes persuasive but respectful sponsorship invitations.",
  "",
  "Task:",
  "Help me draft a professional email inviting a long-standing customer to sponsor an exhibition stall at our annual training conference.",
  "",
  "Context (Audience):",
  "The audience is a loyal customer who values the partnership and attends our conference regularly but has never sponsored before.",
  "They have recently mentioned budget pressures, so the invitation must be persuasive but tactful and sensitive to financial constraints.",
  "The conference brochure is due to print next week, so the message should encourage a prompt response without sounding pushy.",
  "",
  "Format:",
  "Write a professional email in 4–5 short paragraphs.",
  "Use a warm, respectful tone.",
  "Include a clear value proposition, flexible options if budget is tight, a clear call to action, and a polite closing note of appreciation."
].join("\n");

/* ---------------- Learn More (4 tabs) ---------------- */
const FRAMEWORK = {
  gdpr: {
    expectation: "Understanding existing customers",
    case:
      "Selling to an existing customer relies on trust and familiarity. Personalise the message using shared history or previous collaboration to reinforce loyalty. Focus on renewing interest rather than introducing your organisation."
  },
  unesco: {
    expectation: "Value-based selling",
    case:
      "Highlight benefits aligned to the customer’s goals such as brand exposure, professional recognition, and networking. Use concrete figures (e.g. delegate numbers) to demonstrate return on investment."
  },
  ofsted: {
    expectation: "Communication tone and timing",
    case:
      "Use a warm, professional tone. Acknowledge the relationship first, then introduce the opportunity. Encourage timely responses without pressure by referencing print deadlines or limited availability subtly."
  },
  jisc: {
    expectation: "Overcoming budget objections",
    case:
      "Acknowledge budget pressures and offer flexible options such as smaller packages, shared sponsorship, or early-bird rates. Frame sponsorship as a long-term investment in partnership visibility."
  }
};

/* ---------------- Model AI letter (extra dropdown panel) ---------------- */
const MODEL_AI_LETTER = [
  "Subject: Invitation to Sponsor at This Year’s Training Conference",
  "",
  "Dear [Customer Name],",
  "",
  "I hope you’re keeping well. As one of our valued long-time partners, I wanted to personally invite [Company Name] to consider sponsoring an exhibition stall at our Annual Training Conference this April. Your presence has always added great value to our events, and we’d love to showcase your contributions more prominently this year.",
  "",
  "Sponsorship offers visibility to over 400 sector professionals and positions your organisation as a key supporter of workforce development. I understand that budgets are carefully planned, so we’ve included a range of sponsorship options to suit different levels of commitment.",
  "",
  "The conference brochure goes to print next week, so if you’d like to explore this further, I’d be happy to arrange a quick call or send additional details today.",
  "",
  "Thank you again for your continued partnership—your support helps make this event possible.",
  "",
  "With best regards,",
  "[Your Name]",
  "[Job Title]",
  "[Organisation Name]",
  "[Contact Details]"
].join("\n");

/* ---------------- Detection + scoring ---------------- */
const ROLE_HITS = [
  "role:",
  "act as",
  "as an",
  "as a",
  "events coordinator",
  "event coordinator",
  "events co-ordinator",
  "event co-ordinator",
  "events coordinator",
  "events co ordinator",
  "event coordinator",
  "event co ordinator",
  "coordinator",
  "co-ordinator",
  "co ordinator",
  "events lead",
  "events manager",
  "partnership lead",
  "partnerships lead",
  "partnership manager",
  "partnerships manager",
  "sponsorship manager",
  "partnerships and events",
  "events and partnerships"
];

const TASK_HITS = [
  "task:",
  "write",
  "draft",
  "compose",
  "prepare",
  "email",
  "message",
  "inviting",
  "invite",
  "invitation",
  "request",
  "approach",
  "ask",
  "sponsor",
  "sponsorship",
  "exhibition",
  "stall"
];

const CONTEXT_HITS = [
  "context:",
  "audience:",
  "long-standing",
  "longstanding",
  "long term",
  "long-term",
  "loyal customer",
  "existing customer",
  "customer",
  "client",
  "relationship",
  "partnership",
  "budget",
  "pressure",
  "budget pressures",
  "financial",
  "conference",
  "annual conference",
  "exhibition",
  "prospectus",
  "print",
  "deadline",
  "next week",
  "time is limited",
  "time limited",
  "urgent"
];

const FORMAT_HITS = [
  "format:",
  "structure",
  "tone",
  "professional",
  "warm",
  "courteous",
  "concise",
  "polite",
  "4 paragraphs",
  "5 paragraphs",
  "four paragraphs",
  "five paragraphs",
  "short paragraphs",
  "call to action",
  "cta",
  "closing",
  "sign off",
  "clear next step"
];

function statusFromLevel(level) {
  if (level >= 2) return "✓ Secure";
  if (level === 1) return "◐ Developing";
  return "✗ Missing";
}
function tagStatus(level) {
  if (level >= 2) return "ok";
  if (level === 1) return "mid";
  return "bad";
}

function markPrompt(answerText) {
  const wc = wordCount(answerText);

  // HARD GATE
  if (wc < 20) {
    return {
      gated: true,
      wordCount: wc,
      message: "Please add more detail and include Role, Task, Context and Format.",
      score: null,
      strengths: null,
      tags: null,
      grid: null,
      framework: null,
      modelAnswer: null,
      modelAiLetter: null
    };
  }

const t = String(answerText || "")
  .toLowerCase()
  .replaceAll("–", "-")
  .replaceAll("—", "-")
  .replaceAll("’", "'");

  const hasRole = hasAny(t, ROLE_HITS);
  const hasTask = hasAny(t, TASK_HITS);
  const hasContext = hasAny(t, CONTEXT_HITS);
  const hasFormat = hasAny(t, FORMAT_HITS);

  const presentCount = [hasRole, hasTask, hasContext, hasFormat].filter(Boolean).length;

  // bonus specificity (nudges 8–10)
  const boosters =
    (t.includes("budget") ? 1 : 0) +
    (t.includes("next week") || t.includes("deadline") || t.includes("print") ? 1 : 0) +
    (t.includes("call to action") || t.includes("reply") || t.includes("quick call") ? 1 : 0);

  let score =
    presentCount === 4 ? 8 + Math.min(2, boosters) :
    presentCount === 3 ? 6 + Math.min(1, boosters) :
    presentCount === 2 ? 4 + Math.min(1, boosters) :
    2;

  // Strengths
  const strengths = [];
  if (hasRole) strengths.push("You defined a clear role for the AI.");
  if (hasTask) strengths.push("You specified what the email should achieve.");
  if (hasContext) strengths.push("You included relevant audience context.");
  if (hasFormat) strengths.push("You set structure and tone constraints.");
  if (strengths.length < 2) strengths.push("You’ve started shaping the prompt — add the missing RTCF stages for more control.");

  // Tags
  const tags = [
    { name: "Role clarity", status: tagStatus(hasRole ? 2 : 0) },
    { name: "Task clarity", status: tagStatus(hasTask ? 2 : 0) },
    { name: "Context clarity", status: tagStatus(hasContext ? 2 : 0) },
    { name: "Format control", status: tagStatus(hasFormat ? 2 : 0) }
  ];

  // Grid (object-style, matches your current UI)
  const grid = {
    ethical: statusFromLevel(hasRole ? 2 : 0),
    impact: statusFromLevel(hasTask ? 2 : 0),
    legal: statusFromLevel(hasContext ? 2 : 0),
    recs: statusFromLevel(hasFormat ? 2 : 0),
    structure: statusFromLevel(presentCount === 4 ? 2 : presentCount >= 2 ? 1 : 0)
  };

  // Feedback text
  const missing = [];
  if (!hasRole) missing.push("Role: tell AI who to be (events/partnerships role).");
  if (!hasTask) missing.push("Task: specify the output (invitation email asking to sponsor a stall).");
  if (!hasContext) missing.push("Context: include audience details (relationship, budget pressure, print deadline next week).");
  if (!hasFormat) missing.push("Format: set structure/tone (4–5 short paragraphs, warm, persuasive, tactful, clear call to action).");

  const feedback =
    missing.length === 0
      ? "Strong prompt — you gave AI a clear role, purpose, audience context and formatting constraints."
      : "To improve:\n- " + missing.join("\n- ");

  return {
    gated: false,
    wordCount: wc,
    score,
    strengths: strengths.slice(0, 3),
    tags,
    grid,
    framework: FRAMEWORK,
    feedback,
    modelAnswer: MODEL_ANSWER,
    modelAiLetter: MODEL_AI_LETTER
  };
}

/* ---------------- Routes ---------------- */
app.get("/api/config", (_req, res) => {
  res.json({
    ok: true,
    questionText: QUESTION_TEXT,
    templateText: TEMPLATE_TEXT,
    targetWords: "20–300",
    minWordsGate: 20,
    maxWords: 300,
    courseBackUrl: COURSE_BACK_URL,
    nextLessonUrl: NEXT_LESSON_URL
  });
});

app.post("/api/unlock", (req, res) => {
  const code = clampStr(req.body?.code || "", 80).trim();
  if (!code) return res.status(400).json({ ok: false, error: "missing_code" });

  if (!timingSafeEquals(code, ACCESS_CODE)) {
    return res.status(401).json({ ok: false, error: "incorrect_code" });
  }

  setSessionCookie(res);
  return res.json({ ok: true });
});

app.post("/api/mark", requireSession, (req, res) => {
  const answerText = clampStr(req.body?.answerText || req.body?.answer || "", 6000);
  const result = markPrompt(answerText);
  res.json({ ok: true, result });
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/health", (_req, res) => res.status(200).send("ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FEthink automarker running on port ${PORT}`);
});
