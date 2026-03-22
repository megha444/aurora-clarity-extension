// ============================================================
// Clarity — background.js
// Service worker that receives detected pattern context from
// content.js and calls the Anthropic API to generate a witty,
// plain-language commentary card.
// ============================================================

// ⚠️  Replace this with your actual Anthropic API key.
// For a hackathon, you can hardcode it here. In production,
// store it securely using chrome.storage.local.
const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";

const SYSTEM_PROMPT = `You are Clarity, a brutally honest, witty browser assistant that flags psychological manipulation tactics used by websites and apps.

When given a detected manipulation pattern and context, write a SHORT (1–2 sentence) observation in plain human language. Be:
- Direct and honest — don't sugarcoat
- Occasionally dry or darkly funny, but never mean-spirited
- Specific to the site/context when possible
- Focused on the mechanism of manipulation, not moralizing

Never start with "I", never use jargon like "dark pattern" or "UX manipulation". 
Write as if you're a sharp friend whispering in the user's ear.

Examples of good responses:
- "Amazon wants you to feel like you're losing something you never had. You're not."
- "Those 14 people aren't real. Or maybe they are. Either way, you're being watched — and that's the point."
- "This timer resets the moment you leave the tab. It's not a deadline, it's decor."
- "You've been scrolling for 9 minutes. There's no bottom. That's not an accident — it's the product."

Keep it under 40 words.`;

const HOSTNAME_CONTEXT = {
  "www.amazon.com": "Amazon",
  "amazon.com": "Amazon",
  "www.booking.com": "Booking.com",
  "booking.com": "Booking.com",
  "www.macys.com": "Macy's",
  "macys.com": "Macy's",
  "www.instagram.com": "Instagram",
  "instagram.com": "Instagram",
  "www.facebook.com": "Facebook",
  "facebook.com": "Facebook",
  "www.tiktok.com": "TikTok",
  "tiktok.com": "TikTok",
  "www.etsy.com": "Etsy",
  "etsy.com": "Etsy",
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GET_CLARITY_COMMENT") return false;

  const { context } = message;
  const siteName = HOSTNAME_CONTEXT[context.hostname] || context.hostname;

  const userPrompt = `Site: ${siteName}
Pattern detected: ${context.patternDescription}
Matched text on page: "${context.matchedText}"

Write a Clarity observation about this manipulation tactic.`;

  callClaudeAPI(userPrompt)
    .then((comment) => sendResponse({ comment }))
    .catch((err) => {
      console.error("[Clarity] API error:", err);
      sendResponse({ comment: getFallbackComment(context.patternId, siteName) });
    });

  return true; // Required to use sendResponse asynchronously
});

async function callClaudeAPI(userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || "Something manipulative is happening here.";
}

// ─── Fallback comments (used if API fails) ──────────────────
function getFallbackComment(patternId, siteName) {
  const fallbacks = {
    countdown: `${siteName}'s timer resets the moment you leave. It's not a deadline — it's decoration.`,
    scarcity: `${siteName} wants you to feel like you're losing something you never had.`,
    social_proof: `Those viewers aren't necessarily real. Either way, you're being nudged.`,
    fomo_banner: `"Today only" often means "also tomorrow." ${siteName} is betting you won't check.`,
    infinite_scroll: `There's no bottom to this feed. That's not a bug — it's the product.`,
  };
  return fallbacks[patternId] || "Something on this page is designed to rush your decision.";
}
