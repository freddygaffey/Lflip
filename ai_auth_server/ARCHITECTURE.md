# AI infrastructure

How the L Flip in-app assistant is wired together. The **AI server**
(`ai_auth_server/server.py`, Flask on port **5050**) sits between the frontend,
the local **Ollama** model, and the **main backend**. It never holds user data
itself — it borrows the user's auth token, asks the main backend for data the
user has permitted, and turns it into short summaries for the model.

## Components

```
┌──────────────┐        ┌──────────────────┐
│   Frontend   │        │   Ollama (LLM)   │
│  Vue, on     │        │  127.0.0.1:11434 │
│  Cloudflare  │        │ gpt-oss:120b-    │
└──────┬───────┘        │      cloud       │
       │ POST /api/ai/chat      └────────▲─────────┘
       │ (prompt, chat_id,               │ /api/chat
       │  auth token,                    │ (messages + tool schemas)
       │  X-Api-Url header)              │
       ▼                                 │
┌─────────────────────────────────────────────────────────┐
│              AI SERVER  (Flask, :5050)                   │
│                  ai_auth_server/server.py                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ /api/ai/chat handler                               │ │
│  │  1 check tokens_left   (→ main)                     │ │
│  │  2 load chat history   (→ main)                     │ │
│  │  3 record user msg     (→ main)                     │ │
│  │  4 get AiPreferences   (→ main) → allowed_schemas   │ │
│  │  5 tool-calling loop (≤ MAX_TOOL_ROUNDS = 8)        │ │
│  │  6 record AI reply + tokens (→ main)                │ │
│  │  7 first msg → auto-name chat (→ main)              │ │
│  └───────────────┬───────────────────┬────────────────┘ │
│                  │                   │                   │
│   ┌──────────────▼──────┐   ┌────────▼─────────────────┐ │
│   │ Ollama job queue    │   │ tool runtime ("passer")  │ │
│   │ single worker thread│   │ execute_tool():          │ │
│   │ one generation at a │   │  • permission check      │ │
│   │ time (deque + cond) │   │    (allowed_tools)       │ │
│   └─────────────────────┘   │  • fetch only required   │ │
│                             │    categories (cached)    │ │
│                             │  • parser → Context       │ │
│                             │  • tool.run → format      │ │
│                             └──────────┬───────────────┘ │
│                                        │                 │
│   ┌────────────────────────────────────▼──────────────┐ │
│   │ tools package  (tools/)                            │ │
│   │  parser.py  raw JSON → typed Context               │ │
│   │  trip_speed, trip_remoteness, driving_variance,    │ │
│   │  weather_variance, route_diversity,                │ │
│   │  day_night_comparison, car_usage, supervisor_usage,│ │
│   │  saved_roster, user_licence   (+ geo.py helper)    │ │
│   │  each: REQUIRES · SCHEMA · run(ctx) · format_for_ai│ │
│   └────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ Bearer <token>  (forwarded)
                            ▼
┌─────────────────────────────────────────────────────────┐
│           MAIN BACKEND  (Flask, :5000 prod / :5001 dev)  │
│   auth · token limits · chats + messages · AiPreference  │
│   data endpoints:                                        │
│     /api/ai/tokens_left   /api/ai/preferences            │
│     /api/chats/<id>/messages   /api/chats/<id>           │
│     /api/trips  /api/cars  /api/sv  /api/state           │
│                          │                               │
│                          ▼                               │
│                      Database                            │
└─────────────────────────────────────────────────────────┘
```

## Request flow (one chat message)

```
Frontend ──prompt──► AI server
                     │
                     ├─► main: tokens_left?  (429 if none)
                     ├─► main: chat history
                     ├─► main: save user message
                     ├─► main: AiPreferences ─► which tool schemas to offer
                     │
                     │   ┌─ tool-calling loop (max 8 rounds) ─────────────┐
                     ├──►│ Ollama: messages + permitted tool schemas      │
                     │   │   • model returns TEXT  ───────────► done      │
                     │   │   • model returns TOOL CALL:                   │
                     │   │       AI server permission-checks the tool,    │
                     │   │       fetches its data from main, runs it,     │
                     │   │       feeds the summary back ──► loop again    │
                     │   • rounds exhausted: one final no-tools call,     │
                     │     prompted to answer with what it gathered ─► done│
                     │   └────────────────────────────────────────────────┘
                     │
                     ├─► main: save AI reply + tokens_used
                     └─► main: auto-name chat (first message only)
                     │
Frontend ◄──reply────┘
```

## Key design points

- **The AI server is stateless about user data.** It forwards the user's
  `Bearer` token to the main backend for every read/write; it stores nothing.
- **Permissions gate the model, twice.** Only schemas for tools the user has
  enabled (`AiPreference` → `allowed_schemas`) are advertised to Ollama, and
  `execute_tool` re-checks `allowed_tools` before running anything — so a tool
  can't run on data the user hasn't consented to even if the model asks.
- **`REQUIRES` → preference flags → backend endpoints.** A tool declares the
  data categories it needs (`trips`, `cars`, `supervisors`, `licence`); those map
  to `allow_*` flags and to the `/api/...` endpoints the server fetches from.
- **Per-request fetch cache.** `execute_tool` caches each category so multiple
  tools in one message don't re-fetch the same data.
- **Ollama is serialised.** A single worker thread drains a queue so only one
  generation runs at a time (the model handles one well at a time).
- **`X-Api-Url` routing.** The frontend tells the AI server which backend it is
  talking to (prod `api.` / `:5000` vs dev `dev.` / `:5001`) so dev and prod
  stay paired.
- **Token budgeting.** `max_tokens` is the min of the user's 5h and weekly
  remaining tokens; the tool loop spends against that budget. The loop runs up
  to `MAX_TOOL_ROUNDS = 8` so multi-step requests can finish gathering data. If
  every round is used, one final no-tools call is forced — the model is prompted
  to answer with what it has and given a guaranteed budget (min 2000 tokens) so a
  reasoning model still produces visible output. The user always gets a reply for
  their tokens rather than a "try again" fallback.
```
