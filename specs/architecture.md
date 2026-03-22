# Clarity — Architecture Spec

## Stack

- **Extension**: Vanilla JS, Chrome MV3, no build step
- **Backend**: FastAPI (Python), single endpoint
- **AI**: Anthropic Claude (optional, fallback-safe)

## Folder Structure (enforce this)

```
clarity/
├── extension/
│   ├── src/content/content.js       ← page scanner + overlay renderer
│   ├── src/content/overlay.css      ← card styles
│   ├── src/popup/popup.html
│   ├── src/popup/popup.js
│   ├── src/popup/popup.css
│   ├── manifest.json
│   └── icon.png
├── backend/
│   ├── app/main.py                  ← FastAPI app, CORS, load_dotenv
│   ├── app/routers/analyze.py       ← POST /api/analyze
│   ├── app/services/detector.py     ← rule-based detection only
│   ├── app/services/ai_service.py   ← Claude rewrite, always fallback-safe
│   ├── app/models/schemas.py        ← Pydantic models
│   ├── requirements.txt
│   └── .env                         ← never commit, use .env.example
└── demo/
    └── index.html                   ← guaranteed demo target
```

## Constraints

- Detector logic must be in `detector.py` — AI must never touch detection
- AI service must use `run_in_executor` for sync Anthropic client calls
- CORS must allow all origins in development
- `.env` must be in `.gitignore`
- `venv/` must be in `.gitignore`
- Backend port: 8000
- Demo page port: 5500
