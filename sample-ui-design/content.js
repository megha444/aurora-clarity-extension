// ============================================================
// Clarity — content.js
// Scans the DOM for behavioral manipulation patterns,
// sends detected patterns to background.js for AI commentary,
// and injects Clarity overlay cards onto the page.
// ============================================================

const PATTERNS = [
  {
    id: "countdown",
    tag: "urgency",
    color: "#F59E0B",
    badgeColor: "#FEF3C7",
    badgeText: "#92400E",
    badgeLabel: "countdown timer",
    selectors: [
      '[class*="countdown"]',
      '[class*="timer"]',
      '[id*="countdown"]',
      '[id*="timer"]',
    ],
    textPatterns: [/\d{1,2}:\d{2}:\d{2}/, /ends in/i, /expires in/i, /sale ends/i],
    description: "Detected a countdown timer",
  },
  {
    id: "scarcity",
    tag: "scarcity",
    color: "#EF4444",
    badgeColor: "#FEE2E2",
    badgeText: "#991B1B",
    badgeLabel: "false scarcity",
    selectors: [],
    textPatterns: [
      /only \d+ left/i,
      /\d+ remaining/i,
      /low in stock/i,
      /almost gone/i,
      /selling fast/i,
      /limited stock/i,
      /in high demand/i,
    ],
    description: "Detected a scarcity message",
  },
  {
    id: "social_proof",
    tag: "social pressure",
    color: "#8B5CF6",
    badgeColor: "#EDE9FE",
    badgeText: "#5B21B6",
    badgeLabel: "social proof",
    selectors: [],
    textPatterns: [
      /\d+ people (are )?viewing/i,
      /\d+ watching/i,
      /\d+ others? (are )?(looking|viewing)/i,
      /\d+ bought (this )?today/i,
      /\d+ (people )?added to cart/i,
    ],
    description: "Detected a social proof message",
  },
  {
    id: "fomo_banner",
    tag: "urgency",
    color: "#F59E0B",
    badgeColor: "#FEF3C7",
    badgeText: "#92400E",
    badgeLabel: "FOMO banner",
    selectors: ['[class*="banner"]', '[class*="promo"]', '[class*="flash-sale"]'],
    textPatterns: [
      /today only/i,
      /flash sale/i,
      /24.?hour/i,
      /limited time/i,
      /don.?t miss/i,
      /last chance/i,
    ],
    description: "Detected a urgency/FOMO banner",
  },
  {
    id: "infinite_scroll",
    tag: "attention trap",
    color: "#10B981",
    badgeColor: "#D1FAE5",
    badgeText: "#065F46",
    badgeLabel: "infinite scroll",
    selectors: [],
    textPatterns: [],
    description: "Infinite scroll detected",
    special: "scroll",
  },
];

// ─── State ───────────────────────────────────────────────────
const detectedPatterns = new Set();
let sessionStartTime = Date.now();
let scrollCheckInterval = null;
let lastScrollHeight = 0;
let scrollLoadCount = 0;

// ─── Overlay container ───────────────────────────────────────
function ensureContainer() {
  let container = document.getElementById("clarity-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "clarity-container";
    document.body.appendChild(container);
  }
  return container;
}

// ─── Render a Clarity card ───────────────────────────────────
function renderCard(pattern, matchedText, aiComment) {
  const container = ensureContainer();

  const card = document.createElement("div");
  card.className = "clarity-card";
  card.dataset.patternId = pattern.id;

  const minutesOnPage = Math.round((Date.now() - sessionStartTime) / 60000);
  const timeLabel =
    minutesOnPage > 0 ? `${minutesOnPage}m on page` : "just arrived";

  card.innerHTML = `
    <div class="clarity-header">
      <div class="clarity-dot" style="background:${pattern.color}"></div>
      <span class="clarity-brand">CLARITY</span>
      <span class="clarity-tag">${pattern.tag}</span>
      <button class="clarity-close" aria-label="Dismiss">✕</button>
    </div>
    <div class="clarity-body">
      <div class="clarity-comment">${aiComment}</div>
      <div class="clarity-footer">
        <span class="clarity-badge" style="background:${pattern.badgeColor};color:${pattern.badgeText}">
          ${pattern.badgeLabel}
        </span>
        <span class="clarity-time">${timeLabel}</span>
      </div>
    </div>
  `;

  card.querySelector(".clarity-close").addEventListener("click", () => {
    card.classList.add("clarity-card--exit");
    setTimeout(() => card.remove(), 300);
  });

  container.appendChild(card);

  // Auto-dismiss after 12 seconds
  setTimeout(() => {
    if (card.parentNode) {
      card.classList.add("clarity-card--exit");
      setTimeout(() => card.remove(), 300);
    }
  }, 12000);
}

// ─── Request AI comment from background ─────────────────────
function requestComment(pattern, matchedText) {
  if (detectedPatterns.has(pattern.id)) return;
  detectedPatterns.add(pattern.id);

  const context = {
    patternId: pattern.id,
    patternDescription: pattern.description,
    matchedText: matchedText ? matchedText.slice(0, 200) : "",
    hostname: window.location.hostname,
    pathname: window.location.pathname,
  };

  chrome.runtime.sendMessage(
    { type: "GET_CLARITY_COMMENT", context },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[Clarity]", chrome.runtime.lastError.message);
        return;
      }
      if (response && response.comment) {
        renderCard(pattern, matchedText, response.comment);
      }
    }
  );
}

// ─── DOM scanner ─────────────────────────────────────────────
function scanDOM() {
  const fullText = document.body.innerText || "";

  for (const pattern of PATTERNS) {
    if (pattern.special === "scroll") continue;
    if (detectedPatterns.has(pattern.id)) continue;

    let matched = false;
    let matchedText = "";

    // Check CSS selector matches
    for (const sel of pattern.selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = el.innerText || el.textContent || "";
        if (text.trim()) {
          matched = true;
          matchedText = text.slice(0, 200);
          break;
        }
      }
      if (matched) break;
    }

    // Check text patterns across whole page
    if (!matched) {
      for (const regex of pattern.textPatterns) {
        const m = fullText.match(regex);
        if (m) {
          matched = true;
          // Grab surrounding sentence for context
          const idx = fullText.indexOf(m[0]);
          matchedText = fullText.slice(Math.max(0, idx - 30), idx + m[0].length + 60).trim();
          break;
        }
      }
    }

    if (matched) {
      requestComment(pattern, matchedText);
    }
  }
}

// ─── Infinite scroll detector ────────────────────────────────
function setupScrollDetector() {
  let checks = 0;
  scrollCheckInterval = setInterval(() => {
    const currentHeight = document.body.scrollHeight;
    if (currentHeight > lastScrollHeight && lastScrollHeight > 0) {
      scrollLoadCount++;
      if (scrollLoadCount >= 3 && !detectedPatterns.has("infinite_scroll")) {
        const scrollPattern = PATTERNS.find((p) => p.id === "infinite_scroll");
        const mins = Math.round((Date.now() - sessionStartTime) / 60000);
        requestComment(scrollPattern, `User has scrolled through ${scrollLoadCount} content loads in ${mins} minutes`);
      }
    }
    lastScrollHeight = currentHeight;
    checks++;
    if (checks > 60) clearInterval(scrollCheckInterval); // stop after 5 mins
  }, 5000);
}

// ─── MutationObserver for dynamic content ───────────────────
const observer = new MutationObserver(() => {
  scanDOM();
});

// ─── Init ────────────────────────────────────────────────────
function init() {
  scanDOM();
  setupScrollDetector();

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
