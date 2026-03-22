# Clarity

> **AI that makes digital manipulation visible — and a little uncomfortable — in real time.**

Clarity is a Chrome extension that scans websites for behavioral manipulation tactics (urgency, scarcity, social pressure, infinite scroll, and more) and surfaces witty, plain-language commentary powered by Claude. Instead of technical labels, users see messages like:

> *"Amazon wants you to feel like you're losing something you never had. You're not."*

By combining real-time detection with personality, Clarity doesn't just inform users — it makes them pause, reflect, and rethink their next click.

---

## Demo

Three scenes recorded in the wild:

| Site | Pattern | Clarity says |
|------|---------|-------------|
| **amazon.com** | "Only 3 left in stock" | *"Amazon wants you to feel like you're losing something you never had."* |
| **macys.com** | Sale countdown timer | *"Why is Macy's selling wool jackets before summer? This smells like urgency manipulation."* |
| **instagram.com** | Infinite feed | *"You've been scrolling for 9 minutes. There's no bottom. That's not an accident — it's the product."* |

---

## How It Works

```
Page loads
    │
    ▼
Content script scans DOM
(CSS selectors + regex text patterns)
    │
    ├─ Match found? ─────────────────────────────────┐
    │                                                │
    ▼                                                ▼
MutationObserver watches           Pattern + site context
for dynamic content                sent to background.js
    │                                      │
    └──────────────────────────────►  Claude API call
                                          │
                                          ▼
                                Witty 1–2 sentence comment
                                          │
                                          ▼
                                Clarity card animates in
                                (bottom-right, auto-dismisses)
```

---

## Detected Patterns

| Pattern | How detected | Example trigger |
|---------|-------------|-----------------|
| **Countdown timer** | `[class*="countdown"]`, `[class*="timer"]` + regex | "Sale ends in 00:12:47" |
| **False scarcity** | Text regex | "Only 3 left", "Selling fast", "In high demand" |
| **Social proof** | Text regex | "14 people viewing this", "200 bought today" |
| **FOMO banners** | `[class*="banner"]` + regex | "Today only", "Last chance", "Flash sale" |
| **Infinite scroll** | Scroll height delta — fires after 3 content loads | Feed pages on Instagram, TikTok, X |

---

## Getting Started

### Prerequisites

- Google Chrome (or any Chromium browser)
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

**1. Clone the repo**

```bash
git clone https://github.com/your-username/clarity.git
cd clarity
```

**2. Add your API key**

Open `background.js` and replace line 12:

```js
const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";
```

**3. Load the extension in Chrome**

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the root folder of this repo

**4. Go to any major e-commerce or social site**

Clarity will scan the page automatically. Look for the card appearing in the bottom-right corner.

---

## File Structure

```
clarity/
├── manifest.json       Chrome Extension Manifest V3 config
├── content.js          DOM scanner, pattern detection, overlay renderer
├── background.js       Service worker — handles Claude API calls
├── overlay.css         Animated card styles, injected into every page
├── popup.html          Toolbar popup — session stats and on/off toggle
├── pitch-deck.html     Hackathon pitch deck (open in browser, use ← → keys)
└── README.md
```

---

## Architecture

### Content Script (`content.js`)

Runs on every page. Responsibilities:

- **DOM scanning** — runs on `DOMContentLoaded` and continuously via `MutationObserver`
- **Pattern matching** — CSS selectors + regex text patterns across `document.body.innerText`
- **Deduplication** — each pattern only fires once per page load via a `Set`
- **Scroll detection** — polls every 5 seconds to detect infinite scroll (3+ height increases = trigger)
- **Card rendering** — injects `.clarity-card` elements into `#clarity-container`

### Background Service Worker (`background.js`)

Handles all communication with the Anthropic API:

- Receives `GET_CLARITY_COMMENT` messages from the content script
- Builds a context-aware prompt (site name, pattern type, matched text)
- Calls `claude-sonnet-4-20250514` with a tuned system prompt
- Returns the comment, or falls back to a pre-written line if the API is unavailable

### System Prompt

```
You are Clarity, a brutally honest, witty browser assistant that flags psychological
manipulation tactics used by websites and apps.

Write a SHORT (1–2 sentence) observation in plain human language. Be:
- Direct and honest — don't sugarcoat
- Occasionally dry or darkly funny, but never mean-spirited
- Specific to the site/context when possible
- Focused on the mechanism of manipulation, not moralizing

Keep it under 40 words.
```

### Overlay UI

- Fixed position, bottom-right, `z-index: 2147483647`
- Cards animate in with a spring curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Auto-dismiss after 12 seconds; can be closed manually
- Fully scoped under `#clarity-container` — never conflicts with host page styles

---

## Customizing Pattern Detection

To add a new pattern, add an entry to the `PATTERNS` array in `content.js`:

```js
{
  id: "dark_ux",
  tag: "dark UX",
  color: "#3B82F6",
  badgeColor: "#DBEAFE",
  badgeText: "#1E40AF",
  badgeLabel: "pre-checked box",
  selectors: ['input[type="checkbox"][checked]'],
  textPatterns: [/yes, sign me up for/i, /opt.?out/i],
  description: "Detected a pre-checked opt-in box",
},
```

---

## Privacy

Clarity does not:

- Store any browsing history
- Send page content to any server other than the Anthropic API
- Track users across sessions

The only data sent to the API is the **pattern type**, a **short snippet of matched text** (≤200 chars), and the **hostname** of the current site.

---

## Roadmap

- [ ] Personal manipulation score — weekly digest of tactics used on you
- [ ] User-configurable sensitivity levels
- [ ] Community pattern library — crowdsource new detections
- [ ] Firefox support
- [ ] Clarity API for developers who want to audit their own products
- [ ] Block mode — optionally hide manipulative elements entirely

---

## Built With

- [Anthropic Claude API](https://docs.anthropic.com/) — `claude-sonnet-4-20250514`
- Chrome Extensions Manifest V3
- Vanilla JS, CSS — zero dependencies

---

## License

MIT

---

*Built at [Hackathon Name] in 5 hours.*
