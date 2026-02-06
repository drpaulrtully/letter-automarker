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
    // Strengths
    if (strengthsWrap) strengthsWrap.style.display = "none";
    if (strengthsList) strengthsList.innerHTML = "";

    // Tags
    if (tagsWrap) tagsWrap.style.display = "none";
    if (tagsRow) tagsRow.innerHTML = "";

    // Grid
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

      if (questionTextEl) questionTextEl.textContent = data.questionText || "Task loaded.";
      if (targetWordsEl) targetWordsEl.textContent = data.targetWords || "20–300";

      MIN_GATE = data.minWordsGate ?? 20;
      if (minGateEl) minGateEl.textContent = String(MIN_GATE);

      TEMPLATE_TEXT = data.templateText || "";
    } catch (e) {
      console.error("loadConfig failed:", e);
    }
  }

  // ---------------- Gate unlock ----------------
  async function unlock() {
    const code = (codeInput?.value || "").trim();
    if (!code) {
      if (gateMsg) gateMsg.textContent = "Please enter the access code from your lesson.";
      return;
    }

    if (unlockBtn) unlockBtn.disabled = true;
    if (gateMsg) gateMsg.textContent = "Checking…";

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        if (gateMsg) gateMsg.textContent = "That code didn’t work. Check it and try again.";
        return;
      }

      hideGate();
      await loadConfig();
    } catch (e) {
      if (gateMsg) gateMsg.textContent = "Network issue. Please try again.";
      console.error("unlock failed:", e);
    } finally {
      if (unlockBtn) unlockBtn.disabled = false;
    }
  }

  if (unlockBtn) unlockBtn.addEventListener("click", unlock);
  if (codeInput) {
    codeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") unlock();
    });
  }

  // ---------------- Word count live ----------------
  function updateWordCount() {
    if (!answerTextEl || !wordCountBox) return;
    wordCountBox.textContent = `Words: ${wc(answerTextEl.value)}`;
  }
  if (answerTextEl) answerTextEl.addEventListener("input", updateWordCount);
  updateWordCount();

  // ---------------- Template + clear ----------------
  if (insertTemplateBtn) {
    insertTemplateBtn.addEventListener("click", () => {
      if (!answerTextEl || !TEMPLATE_TEXT) return;
      const existing = answerTextEl.value.trim();
      answerTextEl.value = existing ? `${TEMPLATE_TEXT}\n\n---\n\n${existing}` : TEMPLATE_TEXT;
      answerTextEl.focus();
      updateWordCount();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!answerTextEl) return;
      answerTextEl.value = "";
      updateWordCount();
      resetFeedback();
    });
  }

  // ---------------- Learn more toggle ----------------
  if (learnMoreBtn && frameworkPanel) {
    learnMoreBtn.addEventListener("click", () => {
      const isOpen = frameworkPanel.style.display === "block";
      if (isOpen) {
        frameworkPanel.style.display = "none";
        frameworkPanel.setAttribute("aria-hidden", "true");
        learnMoreBtn.setAttribute("aria-expanded", "false");
      } else {
        frameworkPanel.style.display = "block";
        frameworkPanel.setAttribute("aria-hidden", "false");
        learnMoreBtn.setAttribute("aria-expanded", "true");
      }
    });
  }

  // ---------------- Model AI letter toggle ----------------
  if (modelLetterBtn && modelLetterPanel) {
    modelLetterBtn.addEventListener("click", () => {
      const isOpen = modelLetterPanel.style.display === "block";
      if (isOpen) {
        modelLetterPanel.style.display = "none";
        modelLetterPanel.setAttribute("aria-hidden", "true");
        modelLetterBtn.setAttribute("aria-expanded", "false");
      } else {
        modelLetterPanel.style.display = "block";
        modelLetterPanel.setAttribute("aria-hidden", "false");
        modelLetterBtn.setAttribute("aria-expanded", "true");
      }
    });
  }

  // ---------------- Tabs ----------------
  let activeTabKey = "gdpr";

  function setActiveTab(tabKey) {
    activeTabKey = tabKey;

    tabButtons.forEach((btn) => {
      const key = btn.getAttribute("data-tab");
      const isActive = key === tabKey;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    tabPanels.forEach((p) => {
      const key = p.getAttribute("data-panel");
      const show = key === tabKey;
      p.style.display = show ? "block" : "none";
      p.setAttribute("aria-hidden", show ? "false" : "true");
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-tab");
      if (!key) return;
      setActiveTab(key);
    });
  });

  function renderFrameworkTabs(framework) {
    if (!framework || typeof framework !== "object") {
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

  if (!txt) {
    modelLetterWrap.style.display = "none";
    modelLetterText.textContent = "";
    return;
  }

  modelLetterText.textContent = txt;

  // show wrapper, keep collapsed by default
  modelLetterWrap.style.display = "block";
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

    // Object-style grid
    if (!Array.isArray(grid)) {
      gEthical.textContent = grid.ethical || "—";
      gImpact.textContent = grid.impact || "—";
      gLegal.textContent = grid.legal || "—";
      gRecs.textContent = grid.recs || "—";
      gStructure.textContent = grid.structure || "—";
      gridWrap.style.display = "block";
      return;
    }

    // Array-style support (if ever used)
    const getStatus = (label) => {
      const row = grid.find((r) => (r.label || "").toLowerCase() === label.toLowerCase());
      return row ? row.status || "—" : "—";
    };

    gEthical.textContent = getStatus("Role");
    gImpact.textContent = getStatus("Task");
    gLegal.textContent = getStatus("Context");
    gRecs.textContent = getStatus("Format");
    gStructure.textContent = "—";
    gridWrap.style.display = "block";
  }

  // ---------------- Submit for marking ----------------
  async function mark() {
    resetFeedback();

    const answerText = (answerTextEl?.value || "").trim();
    const words = wc(answerText);

    if (!feedbackBox) return;

    if (words === 0) {
      feedbackBox.textContent = `Write your answer first (aim for at least ${MIN_GATE} words).`;
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    feedbackBox.textContent = "Marking…";
    if (wordCountBig) wordCountBig.textContent = String(words);

    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answerText })
      });

      if (res.status === 401) {
        showGate("Session expired. Please re-enter the access code from your Payhip lesson.");
        return;
      }

      const data = await res.json();
      const result = data?.result;

      if (!data?.ok || !result) {
        feedbackBox.textContent = "Could not mark your answer. Please try again.";
        return;
      }

      if (wordCountBig) wordCountBig.textContent = String(result.wordCount ?? words);

      // Gated: minimal message only
      if (result.gated) {
        if (scoreBig) scoreBig.textContent = "—";
        feedbackBox.textContent = result.message || "Please add more detail.";
        resetExtras();
        return;
      }

      // Score
      if (scoreBig) scoreBig.textContent = `${result.score}/10`;

      // Strengths / tags / grid
      renderStrengths(result.strengths);
      renderTags(result.tags);
      renderGrid(result.grid);

      // Improvement notes
      feedbackBox.textContent = result.feedback || result.message || "";

      // Learn more
      if (result.framework) renderFrameworkTabs(result.framework);

      // Model answer (prompt)
     if (modelWrap && modelAnswerEl) {
  if (result.modelAnswer) {
    modelAnswerEl.textContent = result.modelAnswer;
    modelWrap.style.display = "block";
  } else {
    modelWrap.style.display = "none";
  }
}

      // NEW: Model AI letter dropdown
      renderModelLetter(result.modelAiLetter);
    } catch (e) {
      feedbackBox.textContent = "Network issue. Please try again.";
      console.error("mark failed:", e);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  if (submitBtn) submitBtn.addEventListener("click", mark);

  // ---------------- Initial load ----------------
  loadConfig()
    .then(() => showGate())
    .catch((e) => {
      console.error("initial load failed:", e);
      showGate("Please enter the access code from your Payhip lesson.");
    });
})();
