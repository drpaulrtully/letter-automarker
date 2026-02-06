/* =========================================================
   FEthink — Automarker (Prompting)
   Task: Sponsorship invitation prompt (RTCF)
   - Access code gate -> signed httpOnly cookie session
   - Marking rules (server-driven via /api/mark):
       <min words: "Please add..." only; no score; no extras
       >=min words: score + strengths + tags + grid + Learn More + model answer
       + extra dropdown: Model AI letter to customer
   ========================================================= */

(function () {
console.log("FEthink app.js build: LETTER2-20260206");
  // ---------------- DOM refs (null-safe) ----------------
  const gateEl = document.getElementById("gate");
  const codeInput = document.getElementById("codeInput");
  const unlockBtn = document.getElementById("unlockBtn");
  const gateMsg = document.getElementById("gateMsg");

  const backToCourse = document.getElementById("backToCourse");
  const nextLesson = document.getElementById("nextLesson");

  const questionTextEl = document.getElementById("questionText");
  const targetWordsEl = document.getElementById("targetWords");
  const minGateEl = document.getElementById("minGate");

  const insertTemplateBtn = document.getElementById("insertTemplateBtn");
  const clearBtn = document.getElementById("clearBtn");
  const answerTextEl = document.getElementById("answerText");

  const submitBtn = document.getElementById("submitBtn");
  const wordCountBox = document.getElementById("wordCountBox");

  const scoreBig = document.getElementById("scoreBig");
  const wordCountBig = document.getElementById("wordCountBig");
  const feedbackBox = document.getElementById("feedbackBox");

  // Strengths / Tags / Grid
  const strengthsWrap = document.getElementById("strengthsWrap");
  const strengthsList = document.getElementById("strengthsList");

  const tagsWrap = document.getElementById("tagsWrap");
  const tagsRow = document.getElementById("tagsRow");

  const gridWrap = document.getElementById("gridWrap");
  const gEthical = document.getElementById("gEthical");
  const gImpact = document.getElementById("gImpact");
  const gLegal = document.getElementById("gLegal");
  const gRecs = document.getElementById("gRecs");
  const gStructure = document.getElementById("gStructure");

  // Learn more
  const learnMoreWrap = document.getElementById("learnMoreWrap");
  const learnMoreBtn = document.getElementById("learnMoreBtn");
  const frameworkPanel = document.getElementById("frameworkPanel");
  const tabButtons = Array.from(document.querySelectorAll(".tabBtn"));
  const tabPanels = Array.from(document.querySelectorAll(".tabPanel"));

  const gdprExpectation = document.getElementById("gdprExpectation");
  const gdprCase = document.getElementById("gdprCase");
  const unescoExpectation = document.getElementById("unescoExpectation");
  const unescoCase = document.getElementById("unescoCase");
  const ofstedExpectation = document.getElementById("ofstedExpectation");
  const ofstedCase = document.getElementById("ofstedCase");
  const jiscExpectation = document.getElementById("jiscExpectation");
  const jiscCase = document.getElementById("jiscCase");

  // Model answer prompt
  const modelWrap = document.getElementById("modelWrap");
  const modelAnswerEl = document.getElementById("modelAnswer");

  // NEW: Model AI letter dropdown
  const modelLetterWrap = document.getElementById("modelLetterWrap");
  const modelLetterBtn = document.getElementById("modelLetterBtn");
  const modelLetterPanel = document.getElementById("modelLetterPanel");
  const modelLetterText = document.getElementById("modelLetterText");


  // ---------------- Model AI letter toggle (single, reliable block) ----------------
  // One click handler only. Opens/closes by toggling wrapper .open, and also sets panel display for robustness.
  if (modelLetterWrap && modelLetterBtn && modelLetterPanel) {
    modelLetterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("✅ Model letter button clicked");

      // Ensure wrapper is visible (it may be hidden until a letter is returned by the server)
      if (modelLetterWrap.style.display === "none") modelLetterWrap.style.display = "block";

      const isOpen = modelLetterWrap.classList.toggle("open");
      modelLetterBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      modelLetterPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
      modelLetterPanel.style.display = isOpen ? "block" : "none";

      console.log("✅ Model letter:", isOpen ? "OPEN" : "CLOSED");
    });
  }


  // ---------------- Local state ----------------
  let TEMPLATE_TEXT = "";
  let MIN_GATE = 20;

  // ---------------- Helpers ----------------
  function wc(text) {
    const t = String(text || "").trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showGate(message = "") {
    if (!gateEl) return;
    gateEl.style.display = "flex";
    if (gateMsg) gateMsg.textContent = message;
    if (codeInput) codeInput.focus();
  }

  function hideGate() {
    if (!gateEl) return;
    gateEl.style.display = "none";
  }

  function resetExtras() {
    // Strengths/tags/grid
    if (strengthsWrap) strengthsWrap.style.display = "none";
    if (strengthsList) strengthsList.innerHTML = "";

    if (tagsWrap) tagsWrap.style.display = "none";
    if (tagsRow) tagsRow.innerHTML = "";

    if (gridWrap) gridWrap.style.display = "none";
    if (gEthical) gEthical.textContent = "—";
    if (gImpact) gImpact.textContent = "—";
    if (gLegal) gLegal.textContent = "—";
    if (gRecs) gRecs.textContent = "—";
    if (gStructure) gStructure.textContent = "—";

    // Learn more
    if (learnMoreWrap) learnMoreWrap.style.display = "none";
    if (frameworkPanel) {
      frameworkPanel.style.display = "none";
      frameworkPanel.setAttribute("aria-hidden", "true");
    }
    if (learnMoreBtn) learnMoreBtn.setAttribute("aria-expanded", "false");

    // Clear Learn More content
    if (gdprExpectation) gdprExpectation.textContent = "—";
    if (gdprCase) gdprCase.textContent = "—";
    if (unescoExpectation) unescoExpectation.textContent = "—";
    if (unescoCase) unescoCase.textContent = "—";
    if (ofstedExpectation) ofstedExpectation.textContent = "—";
    if (ofstedCase) ofstedCase.textContent = "—";
    if (jiscExpectation) jiscExpectation.textContent = "—";
    if (jiscCase) jiscCase.textContent = "—";

    // Model answer
    if (modelWrap) modelWrap.style.display = "none";
    if (modelAnswerEl) modelAnswerEl.textContent = "";

    // Model AI letter
    if (modelLetterWrap) modelLetterWrap.style.display = "none";
    if (modelLetterWrap) modelLetterWrap.classList.remove("open");
    if (modelLetterPanel) {
      modelLetterPanel.style.display = "none";
      modelLetterPanel.setAttribute("aria-hidden", "true");
    }
    if (modelLetterBtn) modelLetterBtn.setAttribute("aria-expanded", "false");
    if (modelLetterText) modelLetterText.textContent = "";
  }

  function resetFeedback() {
    if (scoreBig) scoreBig.textContent = "—";
    if (wordCountBig) wordCountBig.textContent = "—";
    if (feedbackBox) feedbackBox.textContent = "";
    resetExtras();
  }

  // ---------------- Config load (NAV FIRST) ----------------
  async function loadConfig() {
    try {
      const res = await fetch("/api/config", { credentials: "include" });
      const data = await res.json();
      if (!data?.ok) return;

      // NAV FIRST
      if (backToCourse && data.courseBackUrl) {
        backToCourse.href = data.courseBackUrl;
        backToCourse.style.display = "inline-block";
      }
      if (nextLesson && data.nextLessonUrl) {
        nextLesson.href = data.nextLessonUrl;
        nextLesson.style.display = "inline-block";
      }

      // TASK CONTENT
      if (questionTextEl && data.taskTitle) questionTextEl.textContent = data.taskTitle;
      if (targetWordsEl) targetWordsEl.textContent = String(data.targetWords ?? data.maxWords ?? 300);

      TEMPLATE_TEXT = data.templateText || "";
      MIN_GATE = Number(data.minWords || 20);
      if (minGateEl) minGateEl.textContent = String(MIN_GATE);

      // Gate visibility
      if (data.gated === true) {
        showGate("");
      } else {
        hideGate();
      }

      // Initial reset
      resetFeedback();
      updateWordCount();
    } catch (e) {
      console.error("Config load failed:", e);
    }
  }

  // ---------------- Word count live ----------------
  function updateWordCount() {
    const count = wc(answerTextEl?.value || "");
    if (wordCountBox) wordCountBox.textContent = String(count);
  }

  if (answerTextEl) {
    answerTextEl.addEventListener("input", () => {
      updateWordCount();
      resetFeedback();
    });
  }

  // ---------------- Gate unlock ----------------
  async function unlock() {
    const code = String(codeInput?.value || "").trim();
    if (!code) {
      if (gateMsg) gateMsg.textContent = "Please enter the access code.";
      return;
    }
    if (gateMsg) gateMsg.textContent = "Checking…";

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (data?.ok) {
        if (gateMsg) gateMsg.textContent = "Unlocked — loading…";
        hideGate();
        await loadConfig();
      } else {
        if (gateMsg) gateMsg.textContent = data?.error || "Invalid code.";
      }
    } catch (e) {
      if (gateMsg) gateMsg.textContent = "Could not unlock. Please try again.";
      console.error(e);
    }
  }

  if (unlockBtn) unlockBtn.addEventListener("click", unlock);
  if (codeInput) {
    codeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlock();
    });
  }

  // ---------------- Insert template / Clear ----------------
  if (insertTemplateBtn && answerTextEl) {
    insertTemplateBtn.addEventListener("click", () => {
      answerTextEl.value = TEMPLATE_TEXT || answerTextEl.value;
      updateWordCount();
      resetFeedback();
      answerTextEl.focus();
    });
  }

  if (clearBtn && answerTextEl) {
    clearBtn.addEventListener("click", () => {
      answerTextEl.value = "";
      updateWordCount();
      resetFeedback();
      answerTextEl.focus();
    });
  }

  // ---------------- Learn More tabs ----------------
  let activeTabKey = "gdpr";

  function setActiveTab(key) {
    activeTabKey = key;

    tabButtons.forEach((btn) => {
      const k = btn.getAttribute("data-tab");
      btn.classList.toggle("active", k === key);
    });

    tabPanels.forEach((panel) => {
      const k = panel.getAttribute("data-panel");
      panel.style.display = k === key ? "block" : "none";
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-tab");
      if (key) setActiveTab(key);
    });
  });

  if (learnMoreBtn && frameworkPanel) {
    learnMoreBtn.addEventListener("click", () => {
      const isOpen = frameworkPanel.style.display === "block";
      frameworkPanel.style.display = isOpen ? "none" : "block";
      frameworkPanel.setAttribute("aria-hidden", isOpen ? "true" : "false");
      learnMoreBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });
  }

  // ---------------- Render framework ----------------
  function renderFramework(framework) {
    if (!framework) {
      if (learnMoreWrap) learnMoreWrap.style.display = "none";
      return;
    }

    const gdpr = framework.gdpr || {};
    const unesco = framework.unesco || {};
    const ofsted = framework.ofsted || {};
    const jisc = framework.jisc || {};

    if (gdprExpectation) gdprExpectation.textContent = gdpr.expectation || "—";
    if (gdprCase) gdprCase.textContent = gdpr.case || "—";

    if (unescoExpectation) unescoExpectation.textContent = unesco.expectation || "—";
    if (unescoCase) unescoCase.textContent = unesco.case || "—";

    if (ofstedExpectation) ofstedExpectation.textContent = ofsted.expectation || "—";
    if (ofstedCase) ofstedCase.textContent = ofsted.case || "—";

    if (jiscExpectation) jiscExpectation.textContent = jisc.expectation || "—";
    if (jiscCase) jiscCase.textContent = jisc.case || "—";

    if (learnMoreWrap) learnMoreWrap.style.display = "block";

    // Keep collapsed by default
    if (frameworkPanel) {
      frameworkPanel.style.display = "none";
      frameworkPanel.setAttribute("aria-hidden", "true");
    }
    if (learnMoreBtn) learnMoreBtn.setAttribute("aria-expanded", "false");

    setActiveTab(activeTabKey);
  }

  // ---------------- Render Model AI letter ----------------
  function renderModelLetter(letterText) {
    if (!modelLetterWrap || !modelLetterPanel || !modelLetterBtn || !modelLetterText) return;

    const txt = String(letterText || "").trim();

    // No letter returned -> hide everything
    if (!txt) {
      modelLetterWrap.style.display = "none";
      modelLetterWrap.classList.remove("open");
      modelLetterPanel.style.display = "none";
      modelLetterPanel.setAttribute("aria-hidden", "true");
      modelLetterBtn.setAttribute("aria-expanded", "false");
      modelLetterText.textContent = "";
      return;
    }

    // Letter exists -> show wrapper, keep collapsed by default
    modelLetterText.textContent = txt;
    modelLetterWrap.style.display = "block";
    modelLetterWrap.classList.remove("open");
    modelLetterPanel.style.display = "none";
    modelLetterPanel.setAttribute("aria-hidden", "true");
    modelLetterBtn.setAttribute("aria-expanded", "false");
  }

  // ---------------- Render strengths/tags/grid ----------------
  function renderStrengths(strengths) {
    if (!strengthsWrap || !strengthsList) return;
    if (!Array.isArray(strengths) || strengths.length === 0) {
      strengthsWrap.style.display = "none";
      strengthsList.innerHTML = "";
      return;
    }
    strengthsList.innerHTML = strengths
      .slice(0, 3)
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");
    strengthsWrap.style.display = "block";
  }

  function tagBadge(name, status) {
    const symbol = status === "ok" ? "✔" : status === "mid" ? "◐" : "✗";
    const cls = status === "ok" ? "tag ok" : status === "mid" ? "tag mid" : "tag bad";
    return `<span class="${cls}"><span class="tagStatus">${symbol}</span>${escapeHtml(name)}</span>`;
  }

  function renderTags(tags) {
    if (!tagsWrap || !tagsRow) return;
    if (!Array.isArray(tags) || tags.length === 0) {
      tagsWrap.style.display = "none";
      tagsRow.innerHTML = "";
      return;
    }
    tagsRow.innerHTML = tags.map((t) => tagBadge(t.name || t.label || "", t.status)).join("");
    tagsWrap.style.display = "block";
  }

  function renderGrid(grid) {
    if (!gridWrap || !gEthical || !gImpact || !gLegal || !gRecs || !gStructure) return;
    if (!grid) {
      gridWrap.style.display = "none";
      return;
    }

    gEthical.textContent = grid.ethical ?? "—";
    gImpact.textContent = grid.impact ?? "—";
    gLegal.textContent = grid.legal ?? "—";
    gRecs.textContent = grid.recommendations ?? "—";
    gStructure.textContent = grid.structure ?? "—";

    gridWrap.style.display = "block";
  }

  // ---------------- Mark / Submit ----------------
  async function mark() {
    resetFeedback();

    const text = String(answerTextEl?.value || "");
    const count = wc(text);

    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text })
      });

      const data = await res.json();

      if (data?.gated === true) {
        showGate("");
        return;
      }

      if (data?.wordCount !== undefined) {
        if (wordCountBig) wordCountBig.textContent = String(data.wordCount);
      }

      if (data?.feedback) {
        if (feedbackBox) feedbackBox.textContent = data.feedback;
      }

      if (data?.score !== undefined && data?.score !== null) {
        if (scoreBig) scoreBig.textContent = String(data.score);
      }

      renderStrengths(data?.strengths);
      renderTags(data?.tags);
      renderGrid(data?.grid);
      renderFramework(data?.framework);

      // model answer prompt
      if (modelWrap && modelAnswerEl) {
        const txt = String(data?.modelAnswer || "").trim();
        if (txt) {
          modelAnswerEl.textContent = txt;
          modelWrap.style.display = "block";
        } else {
          modelWrap.style.display = "none";
          modelAnswerEl.textContent = "";
        }
      }

      // Model AI letter (only when server returns it)
      renderModelLetter(data?.modelAiLetter);

    } catch (e) {
      console.error(e);
      if (feedbackBox) feedbackBox.textContent = "Something went wrong. Please try again.";
    }
  }

  if (submitBtn) submitBtn.addEventListener("click", mark);

  // ---------------- Init ----------------
  loadConfig();
})();
