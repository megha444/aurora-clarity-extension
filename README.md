# Clarity

> *"The checkout page has been gaslighting you. We fixed that."*

Clarity is a Chrome extension that detects dark patterns in real time as you browse — and makes them impossible to ignore. Instead of hiding manipulation, Clarity highlights it inline with a purple glow and drops a witty comment right next to it, like a friend who finally calls out the BS.

---

## What it does

- **Watches the DOM live** using MutationObserver and scroll detection
- **Detects 7 dark patterns** — countdown timers, fake scarcity, social proof pressure, pre-checked upsells, confirm shaming, infinite scroll, and free shipping thresholds
- **Highlights manipulative elements** with a purple glow directly on the page
- **Drops an inline comment bubble** next to the flagged element with a witty Claude-powered observation
- **Suggests one concrete action** — uncheck a box, search elsewhere, ignore the timer
- **Severity scoring** — HIGH / MED / LOW badge on every alert so you know what actually matters

---

## Demo

| Pattern | Clarity says |
|---|---|
| Countdown timer | *"Midnight deadline creates fake urgency to rush your purchase"* |
| Pre-checked upsell | *"Sneaky checkbox wants your money for 'protection' like a digital mafia"* |
| Social proof | *"23 people staring at a desk converter? That's some riveting entertainment."* |
| Confirm shaming | *"They want you to feel bad for clicking no. Click it anyway."* |

---

## Built with

- **Chrome Extension** — Manifest V3
- **React + Vite + TypeScript** — UI and build tooling
- **Claude Sonnet API** — pattern explanation and personality
- **Prelint** — spec drift detection on every PR
- **MutationObserver + IntersectionObserver** — live DOM watching

---

## Project structure

```
clarity-extension/
├── public/
│   └── manifest.json         # Chrome extension manifest
├── src/
│   ├── types/
│   │   └── index.ts          # Shared types (PatternSignal, ClarityResponse)
│   ├── patterns/
│   │   └── index.ts          # Pattern detection config + severity scores
│   ├── content/
│   │   └── index.ts          # MutationObserver loop + overlay injection
│   ├── background/
│   │   └── index.ts          # Service worker + Claude API calls
│   └── overlay/
│       └── Overlay.tsx       # React overlay component
├── specs/
│   ├── product-intent.md     # What Clarity does and doesn't do
│   ├── dark-patterns.md      # Canonical pattern list + severity rules
│   └── overlay-voice.md      # Tone guidelines + UI rules
├── test-page/
│   └── index.html            # Local test page with all 7 patterns
└── .env.example              # Required environment variables
```

---

## Getting started

### Prerequisites

- Node.js v20.19+ or v22+
- An Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

### Install

```bash
git clone https://github.com/your-org/aurora-clarity-extension
cd aurora-clarity-extension/clarity-extension
npm install
```

### Configure

```bash
cp .env.example .env
```

Open `.env` and add your key:

```
VITE_ANTHROPIC_KEY=sk-ant-your-key-here
```

### Build

```bash
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

### Test locally

```bash
open test-page/index.html
```

Open the page in Chrome with the extension loaded. You should see purple glow highlights and comment bubbles appear on all 7 dark pattern examples.

---

## Architecture decisions

| Decision | Chose | Rejected | Why |
|---|---|---|---|
| Bundler | Vite + plain rollupOptions | CRXJS plugin | CRXJS caused service worker bundling conflicts |
| API calls | Direct from service worker | Relay Python server | No deploy needed for hackathon |
| DOM watching | MutationObserver + scroll debounce | Page load scan only | Catches dynamic/lazy-loaded content |
| Scroll debounce | 800ms | Fire on every event | Prevents API flood on scroll |
| Overlay UX | Inline highlight + comment | Fixed sidebar | Contextual — shows exactly what's flagged |
| JSON parsing | Strip ```json fences before parse | Trust raw response | Claude occasionally wraps output in markdown |
| Styling | Inline styles in content script | Tailwind CSS | No build dependency, works in any page |

---

## Prelint setup

Clarity uses [Prelint](https://prelint.com) to catch spec drift on every pull request. This means if any PR changes the overlay tone, adds a pattern without a severity score, or introduces a "block user" action that violates our product intent — Prelint flags it before it merges.

### Connect Prelint to this repo

1. Go to [app.prelint.com](https://app.prelint.com) and sign up
2. Click **Connect repository** and select `aurora-clarity-extension`
3. When asked for your spec location, enter: `specs/`
4. Prelint will activate on your next pull request

### What Prelint watches

Prelint checks every PR against the three spec files in `specs/`:

| Spec file | What it enforces |
|---|---|
| `specs/product-intent.md` | Clarity never blocks users, never stores browsing data, only suggests actions |
| `specs/dark-patterns.md` | All 7 patterns are defined, every pattern has a severity score, no site-specific selectors |
| `specs/overlay-voice.md` | Purple glow only, per-card dismiss, no animations over 300ms, never use the word "manipulate" |

### Example Prelint catches

- Someone adds a new pattern without adding it to the `SEVERITY` map → flagged
- A PR changes the highlight color to red → flagged (violates overlay-voice.md)
- A teammate adds a "block checkout" action → flagged (violates product-intent.md)
- The overlay tone shifts to preachy corporate language → flagged

### PR workflow with Prelint

```
You open a PR
      ↓
Prelint reviews against specs/ automatically
      ↓
prelint/review — passed   ✓  or  1 conflict found  ✗
      ↓
Merge only when both code review + Prelint pass
```

---

## Dark patterns detected

| Pattern | Severity | Detection method |
|---|---|---|
| Countdown timer | MED | Selector + keyword (ends in, limited time) |
| Low stock scarcity | MED | Selector + keyword (only X left, selling fast) |
| Social proof pressure | LOW | Selector + keyword (X people viewing) |
| Pre-checked upsell | HIGH | Checkbox selector + keyword (insurance, warranty) |
| Confirm shaming | HIGH | Decline button selector + guilt-trip keywords |
| Infinite scroll | LOW | Selector + keyword (load more) |
| Free shipping threshold | LOW | Keyword (add $X more for free shipping) |

---

## Contributing

This is a hackathon project. If you're one of the four team members building your own version — align on the shared interfaces in `src/types/index.ts` before diverging. The integrator will cherry-pick the best `detectPatterns()`, the best Claude prompt, and the best overlay UI.

The three contracts that must stay compatible across all versions:

```ts
// 1. Signal shape
interface PatternSignal {
  pattern: string
  elementText: string
  pageContext: string
  confidence: 'high' | 'medium'
  site: string
  severity: 1 | 2 | 3
}

// 2. Claude response shape
interface ClarityResponse {
  flag: string
  suggestion: string
  action: 'open_tab' | 'uncheck' | 'dismiss' | null
  actionPayload?: string
  severity?: 1 | 2 | 3
}

// 3. Overlay component API
<ClarityOverlay flag={...} suggestion={...} onAction={...} />
```

---

## Team

Built at the PMAI Vice & Virtue Hackathon, March 2026.

---

## License

MIT
