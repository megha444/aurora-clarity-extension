# Clarity — Product Spec

## What Clarity Is

Clarity is a Chrome extension that flags persuasion signals on web pages and explains, in plain English, how interface language may be nudging users toward rushed or manipulated decisions.

It is a **flagging tool**, not a manipulation adjudicator. It surfaces likely persuasion signals. It does not make final legal or ethical judgments.

## Scope Constraints — Do Not Build

- Dashboard or pattern encyclopedia
- Selector anchoring or screenshot analysis
- `infinite_scroll` or `autoplay` detection
- A generic `dark_ux` category
- Any feature requiring a build step (extension must be vanilla JS)

## Pattern Types — Exactly 5

| Pattern | Severity | Description |
|---|---|---|
| `urgency` | high | Time-pressure language, countdown timers, deadlines |
| `scarcity` | high | Low-inventory claims, limited stock warnings |
| `social_proof` | medium | Viewer counts, purchase counts, trending signals |
| `confirmshaming` | medium | Opt-out language designed to shame the user |
| `hidden_costs` | low | Shipping, fees, taxes not shown upfront |

## Scoring Rules

- high = 40 points
- medium = 25 points
- low = 15 points
- Score is capped at 100
- Labels: <25 = "Low", <50 = "Mild", <75 = "Strong", >=75 = "Heavy"

## API Contract

`POST /api/analyze`
- Input: `{ url: string, page_text: string }`
- Output: `{ url, patterns[], overall_manipulation_score, summary, ai_enhanced }`
- Must return 200 even when AI is unavailable (fallback messages required)
- Rule-based detection must work with no `ANTHROPIC_API_KEY`

## Extension Rules

- Manifest Version 3
- No build step — vanilla JS only
- Content script runs at `document_idle`
- Maximum 3 overlay cards shown per page (high/medium severity only)
- One card per pattern type (no duplicate type cards)
- Popup reads from `chrome.storage.local`

## AI Enhancement Rules

- AI rewrites human_message only — never touches detection logic
- If AI call fails for any reason, fallback messages must appear
- Backend must never return an error because of an AI failure
- Model: claude-3-5-sonnet or equivalent

## Demo Page Requirements

The demo at `demo/index.html` must trigger all 5 pattern types:
- scarcity: "Only 2 left in stock"
- urgency: "Sale ends in" countdown + "Today only"
- social_proof: "37 people are viewing this"
- confirmshaming: "No thanks, I don't want to save $60"
- hidden_costs: "Shipping calculated at checkout"
- Expected score: ≥ 75
