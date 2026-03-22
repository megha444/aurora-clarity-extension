# Clarity — Detected Dark Patterns

## Canonical pattern list

These are the only 7 patterns Clarity detects. Do not add new patterns
without updating this spec.

1. **countdown_timer** — fake urgency via ticking clocks
2. **low_stock** — scarcity warnings about inventory
3. **social_proof_pressure** — "X people viewing" style claims
4. **prechecked_upsell** — checkboxes checked by default
5. **confirm_shaming** — guilt-tripping decline buttons
6. **infinite_scroll** — no-pagination endless feeds
7. **free_shipping_threshold** — "add $X more" nudges

## Detection rules

- Each pattern must have both selector-based AND keyword-based detection
- Confidence is "high" only when both selector AND keyword match
- Pattern config lives in src/patterns/index.ts — single source of truth
- Never hardcode site-specific selectors (no amazon.com-only rules)
