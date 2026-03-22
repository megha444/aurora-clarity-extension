// Use a session key tied to the extension load time so reloading the
// extension resets the guard even without a full page refresh.
const CLARITY_SESSION_KEY = `__clarityRan_${chrome.runtime.id}`;

(async () => {
  if (window[CLARITY_SESSION_KEY]) return;
  window[CLARITY_SESSION_KEY] = true;

  // Wait for page to settle
  await new Promise(r => setTimeout(r, 1500));

  const pageText = document.body.innerText.slice(0, 6000);
  const url = window.location.href;

  let result;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const res = await fetch("http://localhost:8000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, page_text: pageText }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    result = await res.json();
    console.log("[Clarity] Analysis complete:", result.overall_manipulation_score, "score,", result.patterns?.length, "patterns, ai_enhanced:", result.ai_enhanced);
  } catch (e) {
    console.warn("[Clarity] Backend unavailable or timed out:", e.message);
    return;
  }

  chrome.storage.local.set({ clarity_result: result, clarity_url: url });

  if (!result.patterns?.length) return;

  // One card per pattern type, prioritise high > medium, max 3
  const seen = new Set();
  const toShow = [];
  for (const p of result.patterns) {
    if (p.severity === "low") continue;
    if (seen.has(p.pattern_type)) continue;
    seen.add(p.pattern_type);
    toShow.push(p);
    if (toShow.length === 3) break;
  }

  toShow.forEach((pattern, i) => {
    setTimeout(() => renderCard(pattern), i * 600);
  });
})();


// ─── Severity config ──────────────────────────────────────────
const SEV_CONFIG = {
  high:   { dot: "#EF4444", badge: "#FEE2E2", badgeText: "#991B1B", label: "high risk" },
  medium: { dot: "#F59E0B", badge: "#FEF3C7", badgeText: "#92400E", label: "medium risk" },
  low:    { dot: "#3B82F6", badge: "#DBEAFE", badgeText: "#1E40AF", label: "low risk" },
};

// ─── Ensure container ─────────────────────────────────────────
function ensureContainer() {
  let el = document.getElementById("clarity-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "clarity-container";
    document.body.appendChild(el);
  }
  return el;
}

// ─── Render a card ────────────────────────────────────────────
function renderCard(pattern) {
  const container = ensureContainer();
  const cfg = SEV_CONFIG[pattern.severity] || SEV_CONFIG.low;
  const typeLabel = pattern.pattern_type.replace(/_/g, " ");

  const card = document.createElement("div");
  card.className = "clarity-card";

  card.innerHTML = `
    <div class="clarity-header">
      <div class="clarity-dot" style="background:${cfg.dot}"></div>
      <span class="clarity-brand">CLARITY</span>
      <span class="clarity-tag">${typeLabel}</span>
      <button class="clarity-close" aria-label="Dismiss">&#x2715;</button>
    </div>
    <div class="clarity-body">
      <p class="clarity-comment">${pattern.human_message}</p>
      <div class="clarity-footer">
        <span class="clarity-badge" style="background:${cfg.badge};color:${cfg.badgeText}">
          ${cfg.label}
        </span>
        <details class="clarity-why">
          <summary>Why flagged?</summary>
          <p>${pattern.why_it_matters}</p>
          <p class="clarity-match">Matched: <em>"${pattern.matched_text}"</em></p>
        </details>
      </div>
    </div>
  `;

  card.querySelector(".clarity-close").addEventListener("click", () => dismissCard(card));
  container.appendChild(card);

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (card.parentNode) dismissCard(card);
  }, 30000);
}

function dismissCard(card) {
  card.classList.add("clarity-card--exit");
  setTimeout(() => card.remove(), 300);
}
