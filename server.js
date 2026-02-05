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
const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_MINUTES = parseInt(process.env.SESSION_MINUTES || "120", 10);

const COURSE_BACK_URL = process.env.COURSE_BACK_URL || "";
const NEXT_LESSON_URL = process.env.NEXT_LESSON_URL || "";

app.use(cookieParser(COOKIE_SECRET));

/* ---------------- Session cookie helpers ---------------- */
const COOKIE_NAME = "fethink_letter_session";

function setSessionCookie(res) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_MINUTES * 60;
  const payload = { exp };

  res.cookie(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: true, // Render uses HTTPS
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
    const now = Math.floor(Date.now() / 1000);
    return typeof payload?.exp === "number" && now < payload.exp;
  } catch {
    return false;
  }
}

function requireSession(req, res, next) {
  if (!isSessionValid(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
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
  "You have been asked by your manager to contact a longstanding customer, inviting them to sponsor an exhibition stall at your annual training conference.",
  "",
  "Difficulties to consider:",
  "- The customer has a long relationship with your company but has not sponsored before.",
  "- They have recently mentioned budget pressures, so you need to be persuasive but tactful.",
  "- Time is limited — the exhibition prospectus is due for print next week, so the email must encourage a prompt response.",
  "",
  "=== TASK ===",
  "Write a prompt for yourself using the Role, Task, Context (Audience) and Format model.",
  "This will help you plan and structure your professional email effectively.",
  "",
  "=== USE THE FEthink STRUCTURE ===",
  "ROLE: Tell AI who to be (e.g., events coordinator / partnerships lead).",
  "TASK: Tell AI what to write (an invitation email to sponsor).",
  "CONTEXT: Describe the audience and situation (longstanding customer, budget pressures, print deadline next week).",
  "FORMAT: Specify structure and tone (4–5 short paragraphs, warm, persuasive, tactful, clear call to action).",
  "",
  "Aim for 20–300 words."
].join("\n");

const TEMPLATE_TEXT = ["Role:", "Task:", "Context (audience):", "Format (structure/tone):"].join("\n");

const MODEL_ANSWER = [
  "Role:",
  "Act as an events coordinator seeking sponsorship for a company exhibition stall.",
  "",
  "Task:",
  "Write an email inviting a loyal client to sponsor a stall at the annual training conference. Persuade them of the mutual benefits while remaining professional and respectful of their budget situation.",
  "",
  "Context (Audience):",
  "The recipient is a long-term customer who values the partnership and attends the conference regularly but has never sponsored before.",
  "They have recently mentioned budget pressures, so the invitation must be tactful, flexible, and focused on value.",
  "The exhibition prospectus goes to print next week, so the email should encourage a prompt response without sounding pushy.",
  "",
  "Format:",
  "Professional, courteous email (4–5 short paragraphs). Warm yet concise tone, clear call to action, and a closing note of appreciation.",
  "Include: value proposition (reach/visibility), options for different budgets, and a specific next step (reply by date / quick call)."
].join("\n");

/* ---------------- Learn More (4 tabs) ----------------
   We keep keys: gdpr/unesco/ofsted/jisc for tab wiring, but the UI labels are your categories.
------------------------------------------------------ */
const FRAMEWORK = {
  gdpr: {
    expectation: "Understanding Existing Customers",
    case:
      "Selling to an existing customer relies on trust and familiarity. They already know your organisation, so the focus should be on renewing interest rather than introducing yourself. Personalise the message with shared history or previous collaboration to reinforce loyalty."
  },
  unesco: {
    expectation: "Value-Based Selling",
    case:
      "Instead of leading with the cost, highlight benefits that align with the customer’s goals—brand exposure, professional recognition, and networking. Use measurable outcomes like attendance figures or promotional reach to demonstrate return on investment."
  },
  ofsted: {
    expectation: "Communication Tone and Timing",
    case:
      "A warm, professional tone works best. Acknowledge the relationship first, express appreciation, then introduce the opportunity. Before print deadlines, be encouraging but not pushy—stress limited availability or approaching deadlines subtly."
  },
  jisc: {
    expectation: "Overcoming Budget Objections",
    case:
      "Address financial hesitations by proposing flexible options—shared sponsorship, smaller packages, or early-bird discounts. Emphasise long-term advantages over short-term cost and frame it as an investment in partnership visibility and shared success."
  }
};

/* ---------------- Model AI letter dropdown content ---------------- */
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

/* ---------------- Rubric + deterministic marker ----------------
   Bands required:
   - Excellent (8–10)
   - Good (6–7)
   - Fair (3–5)
   - Vague (0–2)

   We score based on presence & specificity of RTCF.
------------------------------------------------------ */
const ROLE_HITS = ["role:", "act as", "events coordinator", "partnership", "sponsorship", "events lead"];
const TASK_HITS = ["task:", "write", "draft", "email", "invite", "inviting", "sponsor", "sponsorship"];
const CONTEXT_HITS = [
  "context:",
  "longstanding",
  "long-standing",
  "budget",
  "pressures",
  "conference",
  "prospectus",
  "print",
  "next week",
  "customer",
  "client",
  "attends",
  "relationship"
];
const FORMAT_HITS = ["format:", "4", "5", "paragraph", "tone", "warm", "concise", "call to action", "structure", "polite"];

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
      message:
        "Please add to your answer.\n" +
        "Aim for 20–300 words and include: Role, Task, Context, and Format.",
      score: null,
      strengths: null,
      tags: null,
      grid: null,
      framework: null,
      modelAnswer: null,
      modelAiLetter: null
    };
  }

  const t = String(answerText || "").toLowerCase();

  const hasRole = hasAny(t, ROLE_HITS);
  const hasTask = hasAny(t, TASK_HITS);
  const hasContext = hasAny(t, CONTEXT_HITS);
  const hasFormat = hasAny(t, FORMAT_HITS);

  const presentCount = [hasRole, hasTask, hasContext, hasFormat].filter(Boolean).length;

  // Specificity boosters (to allow 10, not just 8/9)
  const mentionsBudget = t.includes("budget") || t.includes("pressur");
  const mentionsDeadline = t.includes("print") || t.includes("next week") || t.includes("deadline");
  const mentionsCTA = t.includes("call to action") || t.includes("reply") || t.includes("quick call") || t.includes("book");
  const boosters = [mentionsBudget, mentionsDeadline, mentionsCTA].filter(Boolean).length;

  // Base banding by RTCF presence, then refine within band using boosters
  let score;
  if (presentCount === 4) score = 8 + Math.min(2, boosters);       // 8–10
  else if (presentCount === 3) score = 6 + Math.min(1, boosters);  // 6–7
  else if (presentCount === 2) score = 4 + Math.min(1, boosters);  // 4–5
  else score = 2;                                                  // 0–2 max (we use 2)

  const notes = [];
  if (!hasRole) notes.push("Role: Tell AI who to be (events/partnerships role).");
  if (!hasTask) notes.push("Task: Specify the output (invitation email asking to sponsor a stall).");
  if (!hasContext)
    notes.push("Context: Include audience detail (longstanding customer, budget pressures, deadline next week).");
  if (!hasFormat)
    notes.push("Format: Specify structure/tone (4–5 short paragraphs, warm, persuasive, tactful, clear call to action).");

  // Strengths
  const strengths = [];
  if (hasRole) strengths.push("You defined a clear role, which helps AI choose the right tone and responsibilities.");
  if (hasTask) strengths.push("You clearly described the writing task, reducing ambiguity in the output.");
  if (hasContext) strengths.push("You included audience and situation detail, improving relevance and persuasion.");
  if (hasFormat) strengths.push("You set structure and tone constraints, which improves clarity and professionalism.");

  // Feedback tags
  const tags = [
    { name: "Role clarity", status: tagStatus(hasRole ? 2 : 0) },
    { name: "Task clarity", status: tagStatus(hasTask ? 2 : 0) },
    { name: "Context clarity", status: tagStatus(hasContext ? 2 : 0) },
    { name: "Format control", status: tagStatus(hasFormat ? 2 : 0) },
    { name: "Persuasion detail", status: tagStatus(boosters >= 2 ? 2 : boosters === 1 ? 1 : 0) }
  ];

  // Grid (keeps existing UI keys; your labels in HTML explain them)
  const grid = {
    ethical: statusFromLevel(hasRole ? 2 : 0),
    impact: statusFromLevel(hasTask ? 2 : 0),
    legal: statusFromLevel(hasContext ? 2 : 0),
    recs: statusFromLevel(hasFormat ? 2 : 0),
    structure: statusFromLevel(presentCount === 4 ? 2 : presentCount >= 2 ? 1 : 0)
  };

  // Feedback message
  let band = "Vague";
  if (score >= 8) band = "Excellent";
  else if (score >= 6) band = "Good";
  else if (score >= 3) band = "Fair";

  const feedback =
    notes.length === 0
      ? `Excellent prompt. You gave AI clear structure and enough context to be persuasive but tactful.`
      : `${band} prompt.\nTo improve:\n- ` + notes.join("\n- ");

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
    courseBackUrl: COURSE_BACK_URL,
    nextLessonUrl: NEXT_LESSON_URL,
    questionText: QUESTION_TEXT,
    templateText: TEMPLATE_TEXT,
    targetWords: "20–300",
    minWordsGate: 20,
    maxWords: 300
  });
});

app.post("/api/unlock", (req, res) => {
  const code = String(req.body?.code || "").trim();
  if (!code) return res.status(400).json({ ok: false, error: "missing_code" });

  if (!timingSafeEquals(code, ACCESS_CODE)) {
    return res.status(401).json({ ok: false, error: "incorrect_code" });
  }

  setSessionCookie(res);
  return res.json({ ok: true });
});

app.post("/api/mark", requireSession, (req, res) => {
  const answerText = clampStr(req.body?.answerText, 6000);
  const result = markPrompt(answerText);
  res.json({ ok: true, result });
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/health", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`FEthink sponsorship automarker running on http://localhost:${port}`));
