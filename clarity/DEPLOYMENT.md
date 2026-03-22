# Clarity — Deployment Guide

---

## 🏁 Prelint Hackathon Demo Setup

This is your fastest path to a working live demo for judging.

### Pre-Demo Checklist (run through this before presenting)

```bash
# 1. Start backend
cd clarity/backend
venv/bin/uvicorn app.main:app --reload --port 8000

# 2. Start demo page (separate terminal)
cd clarity/demo
python3 -m http.server 5500

# 3. Verify backend health
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"Clarity"}

# 4. Verify full detection pipeline
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:5500","page_text":"Only 2 left in stock. 37 people are viewing this right now. Sale ends today only. No thanks I dont want to save $60. Shipping calculated at checkout."}'
# Expected: overall_manipulation_score >= 75, 5+ patterns
```

### Demo Flow (60-second pitch)

1. Open `http://localhost:5500` in Chrome — show the ShopFast page
2. Wait 2 seconds — **3 overlay cards slide in** (Urgency, Scarcity, Social Proof)
3. Click **"Why flagged?"** on one card — show matched text + explanation
4. Click the **CLARITY toolbar icon** — show score (100/100), full breakdown, AI badge
5. Test on a real site (e.g. `booking.com`) to show it works in the wild

### Talking Points for Judges

| Question | Answer |
|---|---|
| "How do you know it's manipulation?" | "Clarity flags signals, not verdicts. Every card shows the exact matched phrase — users decide." |
| "What about false positives?" | "Lower-severity signals are filtered from overlays. Each card shows why it was flagged." |
| "Why not use AI for everything?" | "Rule-based detection always works. AI only polishes messages — the demo cannot fail because of a model call." |
| "Does it work on real sites?" | "Yes — try booking.com or amazon.com with the extension loaded." |

---

## 🚀 Backend Deployment (Production)

### Option A — Railway (Recommended, ~5 minutes)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select the `clarity/backend` folder as the root
4. Add environment variable: `ANTHROPIC_API_KEY=your_key`
5. Railway auto-detects Python and runs uvicorn
6. Copy the generated URL (e.g. `https://clarity-api.up.railway.app`)

Add a `Procfile` to `clarity/backend/`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Option B — Render (Free tier available)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo, set root to `clarity/backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env var: `ANTHROPIC_API_KEY=your_key`

**Note:** Free tier spins down after inactivity — add a health-check ping to keep it warm.

### Option C — Fly.io (Best performance)

```bash
cd clarity/backend
fly launch          # auto-detects FastAPI
fly secrets set ANTHROPIC_API_KEY=your_key
fly deploy
```

Add `fly.toml` to `clarity/backend/`:
```toml
[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

---

## 🔧 Update Extension for Production Backend

Once your backend is deployed, update the URL in the content script:

```javascript
// clarity/extension/src/content/content.js — line ~18
const res = await fetch("https://your-backend-url.railway.app/api/analyze", {
```

Then reload the extension in `chrome://extensions/`.

---

## 🌐 Chrome Web Store Submission

### Prepare assets

```
clarity/extension/
├── icon-16.png    (16×16)
├── icon-32.png    (32×32)
├── icon-48.png    (48×48)
├── icon-128.png   (128×128)  ← required for store listing
└── ...
```

Update `manifest.json` icons:
```json
"icons": {
  "16": "icon-16.png",
  "32": "icon-32.png",
  "48": "icon-48.png",
  "128": "icon-128.png"
},
"action": {
  "default_popup": "src/popup/popup.html",
  "default_icon": { "16": "icon-16.png", "32": "icon-32.png" }
}
```

### Package the extension

```bash
cd clarity/extension
zip -r clarity-extension.zip . \
  --exclude "*.DS_Store" \
  --exclude "__MACOSX/*"
```

### Submit

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer registration fee
3. Click **Add new item** → upload `clarity-extension.zip`
4. Fill in: name, description, screenshots (1280×800 or 640×400)
5. Set category: **Productivity**
6. Submit for review (~1–3 business days)

---

## 🔒 Security Notes for Production

| Item | Action |
|---|---|
| API key in `.env` | Never commit — add `.env` to `.gitignore` |
| CORS `allow_origins=["*"]` | Restrict to your extension ID in production: `chrome-extension://YOUR_ID` |
| Rate limiting | Add `slowapi` to prevent abuse |
| Input size | Already capped at 6000 chars in content script |

Add rate limiting to `backend/requirements.txt`:
```
slowapi
```

Add to `backend/app/main.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# On the route:
@router.post("/analyze")
@limiter.limit("20/minute")
async def analyze_page(request: Request, body: AnalyzeRequest):
    ...
```

---

## 📊 Architecture Summary

```
Chrome Extension (MV3)
    │
    ├── content.js         → scans page text, POSTs to backend, renders cards
    ├── popup.js           → reads chrome.storage.local, shows score + patterns
    └── overlay.css        → card styles injected into every page
          │
          ▼
FastAPI Backend (Python)
    │
    ├── /api/analyze       → rule-based detection + optional AI rewrite
    ├── detector.py        → 5 pattern types, regex-based, always works
    └── ai_service.py      → Claude API, run_in_executor, fallback-safe
          │
          ▼
Anthropic Claude API (optional)
    └── claude-3-5-sonnet  → rewrites fallback messages to reference matched text
```

---

*Clarity — Making persuasion signals visible. Built for Prelint Hackathon.*
