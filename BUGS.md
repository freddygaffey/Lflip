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

_(nothing currently open)_

---

## Fixed

### [x] AI chat keyboard is slow to appear and not auto-focused — 2026-07-21
- `ai.vue`: added `focusInput()` which calls `setFocus()` on the input (brings up the
  on-screen keyboard on mobile, unlike plain autofocus), wired into `openChat()`.
- NOTE: verify on a real device — the on-device latency part isn't confirmed by code alone.

### [x] AI chat fails on requests that need lots of tools — 2026-07-21
- `ai_auth_server/server.py`: raised `MAX_TOOL_ROUNDS` from 4 → 8 (`server.py:57`) so the
  model has enough rounds to gather every tool result before answering.

### [x] AI chat input doesn't fill the box properly on mobile — 2026-07-20
- `ai.vue` composer input: added `font-size: 16px` (stops iOS zoom-on-focus) and `width: 100%`.

### [x] AI assistant onboarding step overflows the page — 2026-07-20
- `welcome.vue`: added a `.slide-prefs` compact class shrinking the artwork and header text
  on the AI slide so all five toggles fit without scrolling.

### [x] App icon is blurry and hard to read — 2026-07-20
- Replaced the thin font "L" with a bold geometric L that fills the icon; regenerated the
  iOS app icon and web favicon. Source at `assets/icon.svg`.
