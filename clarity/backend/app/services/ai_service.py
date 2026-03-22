import anthropic
import asyncio
import os
import json
from functools import partial

_client = None

def get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client

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
        loop = asyncio.get_event_loop()
        call = partial(
            get_client().messages.create,
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        message = await loop.run_in_executor(None, call)
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
