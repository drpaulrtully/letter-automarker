import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

/* ---------------- Env / defaults ---------------- */
const ACCESS_CODE = process.env.ACCESS_CODE || "FETHINK-EMAIL-02";
const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString("hex");
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
    return payload?.exp && Math.floor(Date.now() / 1000) < payload.exp;
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
const ROLE_HITS = ["role:", "act as", "events", "coordinator", "partnership"];
const TASK_HITS = ["task:", "write", "draft", "email", "invite", "sponsor"];
const CONTEXT_HITS = ["context:", "long-standing", "budget", "conference", "prospectus", "sponsor"];
const FORMAT_HITS = ["format:", "paragraph", "tone", "call to action", "professional"];

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

  const t = answerText.toLowerCase();
  const hasRole = hasAny(t, ROLE_HITS);
  const hasTask = hasAny(t, TASK_HITS);
  const hasContext = hasAny(t, CONTEXT_HITS);
  const hasFormat = hasAny(t, FORMAT_HITS);
  const presentCount = [hasRole, hasTask, hasContext, hasFormat].filter(Boolean).length;

  let score = presentCount === 4 ? 9 : presentCount === 3 ? 7 : presentCount === 2 ? 5 : 2;

  const strengths = [];
  if (hasRole) strengths.push("You defined a clear role for the AI.");
  if (hasTask) strengths.push("You specified what the email should achieve.");
  if (hasContext) strengths.push("You included relevant audience context.");
  if (hasFormat) strengths.push("You set structure and tone constraints.");

  const tags = [
    { name: "Role clarity", status: tagStatus(hasRole ? 2 : 0) },
    { name: "Task clarity", status: tagStatus(hasTask ? 2 : 0) },
    { name: "Context clarity", status: tagStatus(hasContext ? 2 : 0) },
    { name: "Format control", status: tagStatus(hasFormat ? 2 : 0) }
