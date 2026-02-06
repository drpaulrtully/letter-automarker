import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

/* ---------------- Model AI letter ---------------- */
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
const ROLE_HITS = [ /* unchanged from your file */ ];
const TASK_HITS = [ /* unchanged */ ];
const CONTEXT_HITS = [ /* unchanged */ ];
const FORMAT_HITS = [ /* unchanged */ ];

// ⬆️ KEEP your detection arrays and markPrompt() exactly as they were

/* ---------------- Routes ---------------- */
app.get("/api/config", (_req, res) => { /* unchanged */ });
app.post("/api/unlock", (req, res) => { /* unchanged */ });
app.post("/api/mark", requireSession, (req, res) => { /* unchanged */ });
app.post("/api/logout", (_req, res) => { res.clearCookie(COOKIE_NAME); res.json({ ok: true }); });
app.get("/health", (_req, res) => res.status(200).send("ok"));

/* ---------------- Diagnostics ---------------- */
app.get("/__diag", (_req, res) => {
  const cwd = process.cwd();
  const publicDir = path.join(cwd, "public");
  const indexPath = path.join(publicDir, "index.html");

  let publicExists = false;
  let indexExists = false;
  let publicFiles = [];
  let indexPreview = "";

  try {
    publicExists = fs.existsSync(publicDir);
    indexExists = fs.existsSync(indexPath);
    if (publicExists) publicFiles = fs.readdirSync(publicDir).slice(0, 50);
    if (indexExists) indexPreview = fs.readFileSync(indexPath, "utf8").slice(0, 400);
  } catch {}

  res.json({
    cwd,
    publicDir,
    publicExists,
    indexPath,
    indexExists,
    publicFiles,
    indexPreview,
    renderServiceId: process.env.RENDER_SERVICE_ID || null,
    renderGitCommit: process.env.RENDER_GIT_COMMIT || null,
    nodeEnv: process.env.NODE_ENV || null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FEthink automarker running on port ${PORT}`);
});
