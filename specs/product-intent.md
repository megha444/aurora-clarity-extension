# Clarity — Product Intent

## What Clarity does

- Detects dark patterns in real time as users browse
- Highlights manipulative UI elements with a purple glow
- Shows a witty, human comment bubble inline next to the detected element
- Suggests one concrete action the user can take

## What Clarity does NOT do

- Clarity never blocks user actions or prevents checkout
- Clarity never auto-clicks or modifies the page without user consent
- The only page modifications allowed are: adding highlight styles, injecting comment bubbles
- Clarity never stores or transmits user browsing data

## Tone rules

- Responses must be witty and slightly sarcastic
- Never use the word "manipulate" or "manipulation" in overlay text
- Never be preachy or lecture the user
- Max 15 words for the flag message
- Always suggest one concrete action, never vague advice

## Agent behavior

- One annotation per detected element — never double-annotate
- Dismissed annotations must not reappear for 30 seconds
- Scroll detection must be debounced at 800ms minimum
