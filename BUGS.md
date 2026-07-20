# Bug & Fix List

Add bugs here as you find them. Newest at the top. Move to **Fixed** when done.

Format for a new bug — copy this block:

```
### [ ] Short title
- **Where:** area / file
- **What happens:** what you see go wrong
- **Steps:** how to reproduce it
- **Notes / idea for fix:**
```

---

## Open

### [ ] AI chat keyboard is slow to appear and not auto-focused
- **Where:** `src/views/ai.vue` — chat input field (~line 99)
- **What happens:** There's a lag between the text box appearing and the keyboard popping
  up. The input also isn't focused automatically, so the user has to tap the box manually
  to bring up the keyboard.
- **Steps:** Open the AI chat on a phone → notice the delay before the keyboard shows, and
  that the box isn't already focused.
- **Notes / idea for fix:** Auto-focus the input as soon as the chat/text box opens so the
  keyboard comes up immediately and automatically — no manual tap needed. On Capacitor,
  may need the Keyboard plugin and/or an autofocus on mount to fire reliably on mobile.

### [ ] AI chat fails on requests that need lots of tools
- **Where:** `ai_auth_server/server.py` — tool-calling loop
- **What happens:** Asking L to do a big multi-step task (e.g. "synthesise a report of my
  driving progress and a series of goals") returns *"Sorry, I couldn't produce an answer
  for that. Please try again."*
- **Steps:** Open AI chat → ask for a synthesised report / anything needing several data
  lookups at once.
- **Notes / idea for fix:** The loop is capped at `MAX_TOOL_ROUNDS = 4` (`server.py:57`).
  The model calls tools one round at a time, so it runs out of rounds before it finishes
  gathering data and falls through to the fallback message (`server.py:421`). Likely fix:
  raise the cap (e.g. to 8). Watch that this doesn't blow the per-chat token budget on very
  long conversations.

---

## Fixed

### [x] AI chat input doesn't fill the box properly on mobile — 2026-07-20
- `ai.vue` composer input: added `font-size: 16px` (stops iOS zoom-on-focus) and `width: 100%`.

### [x] AI assistant onboarding step overflows the page — 2026-07-20
- `welcome.vue`: added a `.slide-prefs` compact class shrinking the artwork and header text
  on the AI slide so all five toggles fit without scrolling.

### [x] App icon is blurry and hard to read — 2026-07-20
- Replaced the thin font "L" with a bold geometric L that fills the icon; regenerated the
  iOS app icon and web favicon. Source at `assets/icon.svg`.
