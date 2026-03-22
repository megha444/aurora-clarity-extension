# 🧠 Clarity — Cursor Agent Instructions
> Hackathon: Prelint | Duration: 6 hours | Stack: Vanilla JS Extension + FastAPI

---

## 🎯 PROJECT OVERVIEW

**Clarity** is a Chrome extension that flags common persuasion signals on web pages and explains, in plain English, how interface language may be nudging users toward rushed or manipulated decisions.

When a pattern is detected, a floating overlay appears — e.g.:
*"This page uses a low-inventory cue that may pressure faster decisions. Matched: 'Only 3 left in stock.'"*

Clarity is a **flagging tool**, not a manipulation adjudicator. It surfaces likely persuasion signals and explains them. It does not make final legal or ethical judgments.

---

## ⚠️ SCOPE — BUILD ONLY THESE

- Chrome extension (content script + popup — vanilla JS, no build step)
- FastAPI backend with one endpoint
- Rule-based detector for 5 pattern types
- Optional AI rewrite step for messages only, with hard fallback
- One local demo HTML page with known patterns

**Do not build:** dashboard, pattern encyclopedia, selector anchoring, screenshot analysis, `infinite_scroll`/`autoplay` detection, or a generic `dark_ux` category.

---

## 🏗️ FOLDER STRUCTURE

```
clarity/
├── extension/
│   ├── src/
│   │   ├── content/
│   │   │   └── content.js
│   │   └── popup/
│   │       ├── popup.html
│   │       ├── popup.js
│   │       └── popup.css
│   ├── manifest.json
│   └── icon.png
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   └── analyze.py
│   │   ├── services/
│   │   │   ├── detector.py
│   │   │   └── ai_service.py
│   │   └── models/
│   │       └── schemas.py
│   ├── requirements.txt
│   └── .env
│
└── demo/
    └── index.html
```

---

## ⚡ HOUR-BY-HOUR BUILD ORDER

- **Hour 1** — Extension skeleton + FastAPI with mock response, wired end-to-end
- **Hour 2** — Rule-based detector for 5 patterns (no AI yet)
- **Hour 3** — Content script sends page text; popup reads from storage
- **Hour 4** — Overlay UI, score rendering, demo page working
- **Hour 5** — Optional AI message polishing, fallback-safe
- **Hour 6** — Bug fixes, demo rehearsal, screenshots, pitch prep

End-to-end demo must be working by end of Hour 4.

---

## 📦 STEP 1: Backend Setup

**`backend/requirements.txt`**
```
fastapi
uvicorn[standard]
anthropic
pydantic
python-dotenv
```

**`backend/.env`**
```
ANTHROPIC_API_KEY=your_key_here
```

**`backend/app/models/schemas.py`**
```python
from pydantic import BaseModel
from typing import List

class AnalyzeRequest(BaseModel):
    url: str
    page_text: str

class DetectedPattern(BaseModel):
    pattern_type: str
    severity: str
    matched_text: str
    context: str
    human_message: str
    why_it_matters: str
    confidence: float
    score_contribution: int

class AnalyzeResponse(BaseModel):
    url: str
    patterns: List[DetectedPattern]
    overall_manipulation_score: int
    summary: str
    ai_enhanced: bool
```

---

## 📦 STEP 2: Rule-Based Detector

**`backend/app/services/detector.py`**
```python
import re
from typing import List, Dict

SCORE_MAP = {"low": 15, "medium": 25, "high": 40}

PATTERN_RULES = {
    "urgency": {
        "severity": "high",
        "patterns": [
            r"sale ends(?: in| tonight| soon)?",
            r"today only",
            r"limited time(?: offer)?",
            r"expires? in",
            r"last chance",
            r"flash sale",
            r"deal ends",
            r"hurry[\s,!]",
            r"offer ends",
        ],
        "fallback_message": "This page uses time-pressure language that may push faster decisions.",
        "why_it_matters": "Artificial deadlines can create anxiety and discourage comparison shopping.",
    },
    "scarcity": {
        "severity": "high",
        "patterns": [
            r"only \d+ left(?: in stock)?",
            r"\d+ (items? )?left in stock",
            r"(almost|selling) (gone|fast|out)",
            r"low stock",
            r"limited (stock|availability|supply)",
            r"while supplies last",
        ],
        "fallback_message": "This page flags low inventory, which may not reflect actual stock levels.",
        "why_it_matters": "Low-stock claims can manufacture urgency even when supply is plentiful.",
    },
    "social_proof": {
        "severity": "medium",
        "patterns": [
            r"\d+ people (are )?viewing (this|now)",
            r"\d+ (others? )?(are )?looking at this",
            r"\d+ (people |customers? )?(just |recently )?bought",
            r"\d+ sold in the (last|past) \d+ hours?",
            r"trending",
            r"popular choice",
            r"bestsell(er|ing)",
        ],
        "fallback_message": "This page shows social activity counts that may pressure conformity.",
        "why_it_matters": "Displaying live viewer or buyer counts creates social pressure to act quickly.",
    },
    "confirmshaming": {
        "severity": "medium",
        "patterns": [
            r"no[,\s] thanks[,\s] i (don.t|hate|prefer)",
            r"i (don.t|hate) (want|saving|deals|discounts)",
            r"i prefer to pay (full|more)",
            r"no thanks[,\s] i.ll (pay|miss|pass)",
            r"i don.t (want|need) (to save|savings|discounts)",
        ],
        "fallback_message": "The opt-out language here is designed to make declining feel embarrassing.",
        "why_it_matters": "Confirmshaming uses shame or guilt to coerce users into accepting offers.",
    },
    "hidden_costs": {
        "severity": "low",
        "patterns": [
            r"shipping calculated at checkout",
            r"fees (may )?apply",
            r"taxes (not )?included",
            r"additional charges",
            r"service fee",
        ],
        "fallback_message": "Final price may differ from what is shown here.",
        "why_it_matters": "Prices shown before checkout may not include fees, shipping, or taxes.",
    },
}


class DarkPatternDetector:

    def detect(self, page_text: str) -> List[Dict]:
        text_lower = page_text.lower()
        findings = []
        seen_keys = set()

        for pattern_type, config in PATTERN_RULES.items():
            for regex in config["patterns"]:
                for match in re.finditer(regex, text_lower):
                    key = (pattern_type, match.group())
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)

                    start = max(0, match.start() - 40)
                    end = min(len(page_text), match.end() + 40)
                    context = page_text[start:end].strip()

                    findings.append({
                        "pattern_type": pattern_type,
                        "severity": config["severity"],
                        "matched_text": match.group(),
                        "context": context,
                        "fallback_message": config["fallback_message"],
                        "why_it_matters": config["why_it_matters"],
                        "confidence": 0.85,
                        "score_contribution": SCORE_MAP[config["severity"]],
                    })

        return findings

    def compute_score(self, findings: List[Dict]) -> int:
        return min(sum(f["score_contribution"] for f in findings), 100)

    def score_label(self, score: int) -> str:
        if score < 25:
            return "Low manipulation signals"
        elif score < 50:
            return "Mild persuasion cues detected"
        elif score < 75:
            return "Strong persuasion cues detected"
        else:
            return "Heavy persuasion pressure detected"
```

---

## 📦 STEP 3: AI Service (Optional, Fallback-Safe)

**`backend/app/services/ai_service.py`**
```python
import anthropic
import os
import json

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are Clarity — a browser extension that flags persuasive design patterns on web pages.

You receive a list of detected patterns with matched text. For each, rewrite the human_message to be:
- Short (1–2 sentences max)
- Plain English, slightly dry in tone
- Grounded in the matched text — reference it directly
- Evidence-based and informative, not preachy
- Lightly witty is fine; sarcastic is not

Good examples:
- "This page uses a countdown timer that may not reflect a real deadline."
- "37 people viewing? That figure is designed to create urgency, not inform you."
- "Only 3 left in stock — a claim that may or may not reflect actual inventory."

Output ONLY valid JSON — no preamble, no markdown fences:
{
  "rewrites": [
    {
      "pattern_type": "urgency",
      "human_message": "rewritten message here"
    }
  ],
  "overall_summary": "one sentence summary of all findings"
}
"""


async def rewrite_messages(url: str, findings: list) -> dict | None:
    if not findings:
        return None

    prompt = f"""URL: {url}

Detected patterns:
{json.dumps([{
    "pattern_type": f["pattern_type"],
    "matched_text": f["matched_text"],
    "context": f["context"]
} for f in findings], indent=2)}

Rewrite human_message for each and provide overall_summary.
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = message.content[0].text.strip()

        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw.strip())

    except Exception as e:
        print(f"[Clarity] AI rewrite failed, using fallbacks: {e}")
        return None
```

---

## 📦 STEP 4: FastAPI Router

**`backend/app/routers/analyze.py`**
```python
from fastapi import APIRouter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, DetectedPattern
from app.services.detector import DarkPatternDetector
from app.services.ai_service import rewrite_messages

router = APIRouter()
detector = DarkPatternDetector()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_page(request: AnalyzeRequest):
    findings = detector.detect(request.page_text)
    score = detector.compute_score(findings)
    label = detector.score_label(score)
    ai_enhanced = False

    patterns = [
        DetectedPattern(
            pattern_type=f["pattern_type"],
            severity=f["severity"],
            matched_text=f["matched_text"],
            context=f["context"],
            human_message=f["fallback_message"],
            why_it_matters=f["why_it_matters"],
            confidence=f["confidence"],
            score_contribution=f["score_contribution"],
        )
        for f in findings
    ]

    summary = f"{label}. {len(patterns)} signal(s) detected."

    if findings:
        ai_result = await rewrite_messages(request.url, findings)
        if ai_result:
            ai_enhanced = True
            rewrite_map = {r["pattern_type"]: r["human_message"] for r in ai_result.get("rewrites", [])}
            for p in patterns:
                if p.pattern_type in rewrite_map:
                    p.human_message = rewrite_map[p.pattern_type]
            summary = ai_result.get("overall_summary", summary)

    return AnalyzeResponse(
        url=request.url,
        patterns=patterns,
        overall_manipulation_score=score,
        summary=summary,
        ai_enhanced=ai_enhanced,
    )
```

**`backend/app/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.analyze import router as analyze_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Clarity API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "service": "Clarity"}
```

---

## 📦 STEP 5: Demo Page

**`demo/index.html`**

Use this as the primary demo target. Serve locally and point the extension at it. This guarantees reliable detections for the pitch.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ShopFast — Demo Store</title>
  <style>
    body     { font-family: sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; }
    .badge   { background: #ff4444; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px; }
    .timer   { font-size: 28px; font-weight: bold; color: #cc0000; }
    .cta     { background: #ff6600; color: white; padding: 14px 28px; font-size: 16px; border: none; border-radius: 6px; cursor: pointer; }
    .dismiss { font-size: 11px; color: #888; margin-top: 8px; display: block; }
  </style>
</head>
<body>
  <h1>Premium Wireless Headphones</h1>
  <p><strong>$89.99</strong> <s>$149.99</s> &mdash; Shipping calculated at checkout</p>

  <p class="badge">&#9888;&#65039; Only 2 left in stock &mdash; order soon</p>
  <p>🔥 37 people are viewing this right now</p>
  <p>✅ 142 sold in the last 24 hours</p>
  <p>Sale ends in: <span class="timer" id="timer">02:47:33</span></p>
  <p><em>Limited time offer &mdash; today only!</em></p>

  <br />
  <button class="cta">Add to Cart</button>
  <span class="dismiss">No thanks, I don't want to save $60</span>

  <script>
    let t = 9953;
    setInterval(() => {
      t = Math.max(0, t - 1);
      const h = String(Math.floor(t / 3600)).padStart(2, "0");
      const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
      const s = String(t % 60).padStart(2, "0");
      document.getElementById("timer").textContent = `${h}:${m}:${s}`;
    }, 1000);
  </script>
</body>
</html>
```

Serve: `cd demo && python3 -m http.server 5500`

Expected detections: scarcity (high), urgency (high), social_proof (medium), confirmshaming (medium), hidden_costs (low). Score ≥ 75.

---

## 📦 STEP 6: Chrome Extension — Manifest

**`extension/manifest.json`**
```json
{
  "manifest_version": 3,
  "name": "Clarity — Manipulation Detector",
  "version": "1.0.0",
  "description": "Flags persuasive design patterns in plain English.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": { "32": "icon.png" }
  }
}
```

---

## 📦 STEP 7: Content Script

**`extension/src/content/content.js`**
```javascript
(async () => {
  if (window.__clarityRan) return;
  window.__clarityRan = true;

  await new Promise(r => setTimeout(r, 1500));

  const pageText = document.body.innerText.slice(0, 6000);
  const url = window.location.href;

  let result;
  try {
    const res = await fetch("http://localhost:8000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, page_text: pageText }),
    });
    result = await res.json();
  } catch (e) {
    console.warn("[Clarity] Backend unavailable:", e);
    return;
  }

  chrome.storage.local.set({ clarity_result: result, clarity_url: url });

  if (!result.patterns?.length) return;

  injectStyles();

  result.patterns
    .filter(p => p.severity === "high" || p.severity === "medium")
    .slice(0, 3)
    .forEach((pattern, i) => {
      setTimeout(() => renderOverlay(pattern, i), i * 500);
    });
})();


function renderOverlay(pattern, index) {
  const id = `clarity-${Date.now()}-${index}`;
  const bottom = 20 + index * 135;

  const el = document.createElement("div");
  el.id = id;
  el.className = "clarity-overlay";
  el.style.bottom = `${bottom}px`;
  el.innerHTML = `
    <div class="clarity-header">
      <span class="clarity-label">${formatType(pattern.pattern_type)}</span>
      <span class="clarity-sev clarity-sev--${pattern.severity}">${pattern.severity}</span>
      <button class="clarity-close" onclick="document.getElementById('${id}').remove()">&#x2715;</button>
    </div>
    <p class="clarity-msg">${pattern.human_message}</p>
    <details class="clarity-why">
      <summary>Why was this flagged?</summary>
      <p>${pattern.why_it_matters}</p>
      <p class="clarity-match">Matched: <em>"${pattern.matched_text}"</em></p>
    </details>
  `;

  document.body.appendChild(el);
  setTimeout(() => document.getElementById(id)?.remove(), 10000);
}

function formatType(type) {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function injectStyles() {
  if (document.getElementById("clarity-styles")) return;
  const style = document.createElement("style");
  style.id = "clarity-styles";
  style.textContent = `
    .clarity-overlay {
      position: fixed;
      right: 20px;
      z-index: 2147483647;
      background: #0f0f0f;
      color: #f0f0f0;
      border: 1px solid #2a2a2a;
      border-left: 3px solid #ff4444;
      border-radius: 10px;
      padding: 12px 14px;
      max-width: 300px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      box-shadow: 0 4px 20px rgba(0,0,0,0.7);
      animation: clarityIn 0.25s ease-out;
    }
    @keyframes clarityIn {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .clarity-header  { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .clarity-label   { font-weight: bold; font-size: 10px; color: #aaa; flex: 1; text-transform: uppercase; }
    .clarity-close   { background: none; border: none; color: #555; cursor: pointer; font-size: 13px; padding: 0; }
    .clarity-close:hover { color: #f0f0f0; }
    .clarity-sev     { padding: 2px 6px; border-radius: 3px; font-size: 9px; text-transform: uppercase; }
    .clarity-sev--high   { background: #ff4444; color: white; }
    .clarity-sev--medium { background: #ff8c00; color: white; }
    .clarity-sev--low    { background: #4a9eff; color: white; }
    .clarity-msg     { margin: 0 0 8px; font-size: 12px; color: #e0e0e0; }
    .clarity-why     { font-size: 11px; color: #888; }
    .clarity-why summary { cursor: pointer; color: #4a9eff; user-select: none; }
    .clarity-why p   { margin: 4px 0; }
    .clarity-match   { color: #666; }
  `;
  document.head.appendChild(style);
}
```

---

## 📦 STEP 8: Extension Popup

**`extension/src/popup/popup.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <header>
    <span class="logo">🔍 Clarity</span>
    <span class="tagline">Persuasion signals detector</span>
  </header>
  <div id="content">
    <p class="empty">Analyzing current page…</p>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**`extension/src/popup/popup.js`**
```javascript
chrome.storage.local.get(["clarity_result", "clarity_url"], ({ clarity_result }) => {
  const content = document.getElementById("content");

  if (!clarity_result) {
    content.innerHTML = `<p class="empty">No analysis yet.<br/>Visit a page to scan it.</p>`;
    return;
  }

  const { patterns, overall_manipulation_score, summary, ai_enhanced } = clarity_result;

  const scoreClass =
    overall_manipulation_score >= 75 ? "score-high"
    : overall_manipulation_score >= 50 ? "score-medium"
    : overall_manipulation_score >= 25 ? "score-low"
    : "score-none";

  content.innerHTML = `
    <div class="score-wrap">
      <div class="score ${scoreClass}">${overall_manipulation_score}</div>
      <div class="score-sub">/100 persuasion score</div>
    </div>
    <p class="summary">${summary}</p>
    ${ai_enhanced ? '<p class="ai-badge">✦ AI-enhanced messages</p>' : ''}
    <div class="patterns">
      ${patterns.length === 0
        ? `<p class="empty">No signals detected on this page.</p>`
        : patterns.map(p => `
          <div class="card card--${p.severity}">
            <div class="card-header">
              <span class="card-type">${p.pattern_type.replace(/_/g, " ")}</span>
              <span class="sev sev--${p.severity}">${p.severity}</span>
            </div>
            <p class="card-msg">${p.human_message}</p>
            <p class="card-match">↳ "${p.matched_text}"</p>
          </div>
        `).join("")
      }
    </div>
  `;
});
```

**`extension/src/popup/popup.css`**
```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 340px;
  min-height: 200px;
  background: #0a0a0a;
  color: #f0f0f0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #1a1a1a;
}
.logo    { font-weight: bold; font-size: 14px; }
.tagline { font-size: 10px; color: #444; }

.score-wrap { text-align: center; padding: 20px 0 8px; }
.score      { font-size: 56px; font-weight: bold; line-height: 1; }
.score-high   { color: #ff4444; }
.score-medium { color: #ff8c00; }
.score-low    { color: #4a9eff; }
.score-none   { color: #333; }
.score-sub  { font-size: 10px; color: #444; margin-top: 4px; }

.summary  { padding: 8px 16px 6px; color: #666; font-size: 11px; line-height: 1.5; }
.ai-badge { padding: 2px 16px 10px; font-size: 10px; color: #4a9eff; }

.patterns { padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 8px; }

.card {
  background: #111;
  border: 1px solid #1e1e1e;
  border-left: 3px solid #2a2a2a;
  border-radius: 6px;
  padding: 10px 12px;
}
.card--high   { border-left-color: #ff4444; }
.card--medium { border-left-color: #ff8c00; }
.card--low    { border-left-color: #4a9eff; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.card-type   { font-size: 10px; color: #666; text-transform: capitalize; }
.sev         { padding: 1px 5px; border-radius: 3px; font-size: 9px; text-transform: uppercase; }
.sev--high   { background: #ff4444; color: white; }
.sev--medium { background: #ff8c00; color: white; }
.sev--low    { background: #4a9eff; color: white; }

.card-msg   { font-size: 11px; color: #d0d0d0; line-height: 1.5; margin-bottom: 4px; }
.card-match { font-size: 10px; color: #444; font-style: italic; }

.empty { padding: 24px 16px; color: #444; text-align: center; line-height: 1.7; }
```

---

## 🎨 DESIGN TOKENS

```css
:root {
  --bg-primary:    #0a0a0a;
  --bg-secondary:  #111111;
  --bg-card:       #1a1a1a;
  --accent-red:    #ff4444;
  --accent-orange: #ff8c00;
  --accent-blue:   #4a9eff;
  --text-primary:  #f0f0f0;
  --text-secondary:#888888;
  --border:        #1e1e1e;
  --font:          'Courier New', 'Fira Code', monospace;
}
```

Aesthetic: terminal-noir. Monospace, dark, precise. Like something is being exposed.

---

## 🧪 VERIFY THE BACKEND

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:5500",
    "page_text": "Only 2 left in stock — order soon. 37 people are viewing this right now. Sale ends in 02:47:33. Today only! No thanks, I dont want to save $60. Shipping calculated at checkout."
  }'
```

Expected: 5 patterns, `overall_manipulation_score` ≥ 75, `ai_enhanced: false` (or `true` if API key is set).

---

## ✅ MVP CHECKLIST

- [ ] `uvicorn` starts without errors
- [ ] `/api/analyze` returns valid JSON with `patterns` and `overall_manipulation_score`
- [ ] Rule-based detection works with no `ANTHROPIC_API_KEY` set
- [ ] AI rewriting fails gracefully — fallback messages appear, no crash
- [ ] Extension loads as unpacked in Chrome without console errors
- [ ] Demo page at `localhost:5500` triggers at least 3 overlays
- [ ] Popup shows score, summary, and per-pattern matched text
- [ ] "Why was this flagged?" expander works in the overlay

---

## 🏆 STRETCH GOALS (Hour 6 only)

- [ ] Test on one real site (Booking.com or similar)
- [ ] Store last 10 scans in `chrome.storage.local`, show history in popup
- [ ] "Scan Now" button in popup that re-triggers content script on demand
- [ ] Confidence threshold toggle to hide low-confidence results

---

## 🚀 START COMMANDS

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Demo page
cd demo
python3 -m http.server 5500

# Extension — no build step needed
# Chrome → chrome://extensions/ → Developer Mode ON
# → Load Unpacked → select the /extension folder
```

---

## 🎤 PITCH PREP

**"How do you know it's really manipulation?"**
Clarity is a flagging tool, not a legal adjudicator. It combines deterministic signal detection with contextual explanation. It surfaces likely persuasion tactics and invites users to decide for themselves.

**"What about false positives?"**
Every overlay shows the exact matched phrase and a "Why was this flagged?" explanation. Users can evaluate the signal themselves. Lower-severity signals are filtered from overlays to reduce noise.

**"Why not use AI for everything?"**
Reliability. If the model is unavailable or returns malformed output, rule-based detection still works perfectly. AI is used only to improve message quality — it never touches detection logic. The demo cannot fail because of a model call.

---

*Built for Prelint Hackathon | Clarity — Making persuasion signals visible.*
