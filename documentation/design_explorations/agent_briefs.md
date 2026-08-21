# Design-exploration agent briefs

How the ten Log Trip design explorations were produced: each prototype was built by an
independent agent from one of the briefs below, none seeing the others' work. Round one
(six layout studies) ran first; its results converged on form-plus-button, so round two
(four mechanism studies) banned that vocabulary outright. A third pass added the working
"Interactive — try it" demo to every file. Models: round one ran on the session default,
rounds two (except 07) and three ran on Sonnet.

Every brief demanded: four static frames (ready / plates connecting / recording / a
rejected in-direction variant with its reason), an honest ~100-word self-evaluation
written by the direction's own author, realistic data only, self-verification by
rendering and correcting the agent's own screenshot, and no attribution or emoji.

---

## Round one — layout studies (shared core brief)

Common to all six; each direction swapped in its own DIRECTION and EXPERIMENT sections.

> You are building ONE design-exploration prototype for the L Flip design portfolio.
> L Flip is a learner-driver logbook app (ACT, Australia) with motorised BLE L-plates;
> this is a STATIC visual mock of its "Log Trip" screen — no interactivity needed, it
> just has to look completely realistic.
>
> DELIVERABLE: one fully self-contained HTML file. No external resources of any kind.
> System fonts only. No JavaScript needed (static page).
>
> PAGE STRUCTURE: a dark neutral canvas page with a header naming the direction, then
> FOUR phone frames side by side (~390x844 each, rounded corners, slim iOS-style status
> bar at top, and the app's bottom tab bar: four tabs "Log / Dashboard / AI Chat /
> Settings", dark #1d1d1d bar, inactive grey, active tab green with icon+label):
>   1. READY — form complete, plates connected, start available (labelled "Ready")
>   2. CONNECTING — plates still connecting: start shown in warning/amber state, hint
>      "Connecting to L-plates…" (labelled "Plates connecting")
>   3. RECORDING — trip running: started time 15:54, elapsed 00:23:45, "feel free to
>      lock your phone" note, Stop Recording (danger) + Cancel trip actions
>   4. REJECTED VARIANT — your second layout experiment, clearly labelled "Rejected
>      variant" with a one-line reason it lost
>
> REQUIRED SCREEN CONTENT (all states where sensible): odometer input showing 48468,
> car select showing "Mum's Corolla", supervising driver select showing "Sarah Whitman"
> (the app also supports a Guest driver with full-name + licence-number fields — show
> or hint this), plate hardware status line, the start action. Data must be realistic —
> no lorem, no placeholders.
>
> BRANDING (from the project style guide — follow it): palette --lp-red:#b90413,
> --lp-yellow:#c5bf10, --lp-green:#36a225, --lp-dark:#1d1d1d, --lp-blue:#4232b4, light
> app background #f4f4f4, secondary text #8b8b8b. Corner radius 14px on cards/buttons.
> Cards white with shadow 0 2px 8px rgba(0,0,0,.08). Buttons: no uppercase, font-weight
> 600. Brand mark = rounded yellow tile with bold black Impact "L". Tone: friendly,
> clean, generous spacing.
>
> Below the frames add a visible self-evaluation strip (~100 words max): Strengths /
> Weaknesses / When this design wins. Keep it honest.
>
> HARD RULES: no AI attribution anywhere, no emoji anywhere, realistic content only.
>
> VERIFY before finishing: render with headless Chrome (window 1800x1300, screenshot
> next to the HTML), then Read the PNG and fix any overflow, overlap, or clipped text.
> Iterate until it looks portfolio-grade, and leave the final PNG in place. Report back:
> the file paths, which variant won and why, and your self-evaluation text.

### 01 Big Button + grid — direction & experiment

> YOUR DIRECTION — "Big Button + grid": one huge circular start button dominates the
> screen; everything else (odo, car, supervisor, plate status) is a compact grid of
> tiles below it. Maximum thumb reach, minimum reading.
> YOUR EXPERIMENT: build it twice — once with a RED start button (record-button
> convention: cameras, Strava), once with the brand GREEN start. Pick the winner as
> your main three frames; the loser becomes frame 4 with your honest one-line reason.
> Argue it properly (brand says red = danger/errors, but red-means-record is a strong
> convention; visibility in a car matters).

### 02 Dashboard-first — direction & experiment

> YOUR DIRECTION — "Dashboard-first": the learner's progress is the hero — the
> pie/ring charts (Day hours yellow #c5bf10, Night hours dark #1d1d1d, Total green
> #36a225, empty portion #e0e0e0) sit at the top as motivation, and the start-trip
> action is secondary beneath them. The pitch: you open the app to see how close you
> are to 100 hours, and starting a drive is the natural next step. Realistic data:
> 63.5 h total of 100 h required, 9.2 of 10 night hours.
> YOUR EXPERIMENT: try two arrangements (e.g. three rings in a row vs one dominant
> total ring with small satellites) — keep the better as your main frames, the loser
> is frame 4 with an honest one-line reason.
> Self-evaluation honesty prompt: does burying the start action under charts slow the
> core task?

### 03 Wizard flow — direction & experiment

> YOUR DIRECTION — "Wizard flow": break trip setup into one decision per screen with a
> clear stepper (car -> supervisor -> odometer -> go), ending in a single confident GO.
> The pitch: a first-time or nervous user can never miss a required field; validation
> happens one step at a time. Frames adapted: (1) a mid-flow step choosing the
> supervisor, (2) the final step as a confirmed summary with plates connecting in
> amber and a big GO, (3) recording, (4) rejected variant.
> YOUR EXPERIMENT: try two stepper treatments (e.g. numbered dots across the top vs a
> vertical checklist that fills in) — keep the better; the loser is frame 4 with an
> honest one-line reason.
> Self-evaluation honesty prompt: repeat users pay a tap tax every single drive.

### 04 Map-first — direction & experiment

> YOUR DIRECTION — "Map-first": the map is the canvas; the trip you are about to
> record is the point of the app, so show the world it will happen in. Form lives in a
> bottom sheet over the map; start floats. Draw the map yourself as stylised inline
> SVG or CSS — soft grey-green ground, lighter road ribbons, a few street names like
> "Northbourne Ave", "Commonwealth Ave", a blue location dot; make it genuinely look
> like a maps app, Canberra-flavoured. Recording frame: the trip drawn as a green
> route line, elapsed in a floating pill.
> YOUR EXPERIMENT: try two treatments of the form-over-map (e.g. tall bottom sheet
> with full form vs minimal chips + floating start button) — keep the better; the
> loser is frame 4 with an honest one-line reason.
> Self-evaluation honesty prompt: the map is decorative before the trip starts,
> GPS/battery cost, small form targets.

### 05 Paper logbook — direction & experiment

> YOUR DIRECTION — "Paper logbook": mirror the official ACT paper learner logbook a
> learner and supervisor already trust — ruled rows, column headers (date, start/end
> odo, hours, day/night, supervisor signature), the new trip is just "the next row",
> and starting a drive begins filling it. The pitch: zero learning curve and instant
> credibility with parents/assessors. Include 2-3 previous completed rows so the
> ledger reads real. The paper metaphor may soften the palette but the brand colours
> must still carry status (green start, amber connecting, red stop).
> YOUR EXPERIMENT: try two treatments (e.g. full skeuomorph with ruled paper texture
> and handwriting-style entries vs a clean "ledger-inspired" flat table) — keep the
> better; the loser is frame 4 with an honest one-line reason.
> Self-evaluation honesty prompt: tables are cramped on a phone, tiny touch targets,
> nostalgia vs usability.

### 06 Car-dashboard HMI — direction & experiment

> YOUR DIRECTION — "Car-dashboard HMI": designed for a phone in a windscreen cradle —
> dark automotive theme, huge glanceable type, a 2x2 grid of status tiles (odometer,
> car, supervisor, plates), and one full-width start bar you could hit without
> looking. Think CarPlay / dashboard instrument cluster, but in L Flip's palette.
> Every interactive element at least 60px tall; readable at arm's length (test:
> legible when the screenshot is scaled to 25%).
> YOUR EXPERIMENT: try two tile treatments (e.g. outlined tiles on pure dark vs
> filled elevated cards) — keep the better; the loser is frame 4 with an honest
> one-line reason.
> Self-evaluation honesty prompt: brilliant in the cradle, heavy-handed for
> on-the-couch review; dark data entry is harder.

---

## Round two — mechanism studies (shared core brief)

Common preamble for all four, replacing round one's structure rules:

> Six earlier explorations all converged on the same fundamental UI — a vertical form
> plus a big rounded start button. Your job is a prototype that is STRUCTURALLY
> UNMISTAKABLE from that: the interaction mechanism is the point.
>
> BANNED (hard rules): vertical stacks of labelled form fields; any full-width
> rounded-rectangle primary button; card/tile grids. If your screen could be mistaken
> for "a form with a button", you have failed the brief.
>
> (Same four-frame structure, self-evaluation, data, verification and hard rules as
> round one; the bottom tab bar becomes OPTIONAL — omit it if the mechanism wants the
> space; branding reduced to palette only — total layout freedom.)

### 07 Slide to commit

> YOUR MECHANISM — "Slide to commit": starting a drive is a deliberate physical
> gesture, not a tap.
> - Start control: a wide slide track ("Slide to start drive") with a draggable thumb,
>   like slide-to-unlock / slide-to-pay.
> - Odometer: a mechanical drum-roller — six adjacent digit wheels styled like a real
>   car odometer (48468), the editable digit visually mid-roll.
> - Car and supervisor: horizontal snap carousels (car cards / supervisor avatars side
>   by side, centre item active, neighbours peeking). Guest driver appears as the last
>   carousel item ("Guest — add name + licence").
> - Plate status: expressed in the mechanism's own vocabulary — the slide track itself
>   is amber and reads "Connecting to L-plates…" until ready, green track when
>   connected.
> - Recording state: the slider reverses into a red "Slide to stop" track; elapsed
>   00:23:45 shown big; started 15:54.
> YOUR EXPERIMENT: horizontal slide track vs a vertical "handbrake release" pull-down
> gesture. Keep the winner in frames 1-3; the loser is frame 4.

### 08 Pre-flight switch panel

> YOUR MECHANISM — "Pre-flight switch panel": starting a drive is arming a system,
> aviation-style. There is NO start button at all.
> - The screen is a panel of chunky physical toggle switches with engraved-style
>   labels, each one a precondition: CAR (Mum's Corolla), SUPERVISOR (Sarah Whitman;
>   a small placard notes "guest: name + licence"), ODOMETER (48468, set via a
>   segmented click-stepper next to the switch, not a text field), PLATES (this switch
>   throws ITSELF when the BLE link comes up — show it mid-amber in the connecting
>   frame).
> - When all four switches are up, a red guarded cover at the bottom flips open to
>   reveal the ARM control — starting = lifting the guard and throwing the master
>   switch. Show the guard closed (not ready) vs open (ready).
> - Recording: the panel becomes a live annunciator strip — REC lamp lit, elapsed
>   00:23:45 on a seven-segment-style readout, started 15:54; stopping = throwing the
>   master switch back down (guard open, switch lit red).
> - Status lamps (round indicator lights) carry plate state: green steady = connected,
>   amber = connecting.
> YOUR EXPERIMENT: guarded master switch vs auto-start countdown (no master switch —
> when the last precondition flips, a 3-2-1 countdown begins). Keep the winner; loser
> is frame 4.
> Self-evaluation honesty prompt: discoverability of switches, accidental-arm risk,
> fun vs efficiency.

### 09 Conversation

> YOUR MECHANISM — "Conversation": trip setup is a message thread with the app (the
> product already ships a road-rules chatbot, so the thread is native to it).
> - The whole screen is a chat: the app asks, the learner answers by tapping
>   quick-reply chips or typing.
>   App: "Ready for a drive. Which car?" -> chips [Mum's Corolla] [Dad's Hilux]
>   [Guest car]
>   App: "Who's supervising?" -> chips [Sarah Whitman] [Guest — name + licence]
>   App: "Odometer reading? Last trip ended at 48412." -> learner's typed bubble:
>   "48468"
>   App (connecting frame): "Flipping your L-plates now…" with an amber
>   typing/progress indicator — plate status lives inside the conversation.
>   App (ready frame): "Plates are up. Say go when you're ready." -> a single [Go]
>   chip (a chip, not a button bar).
> - Recording: the thread continues as a live log — timestamped system bubbles:
>   "15:54 — Trip started", "15:58 — Plates showing L, front and rear", a pinned
>   compact header with elapsed 00:23:45, and a [Stop] chip. The trip IS the
>   transcript.
> - One small touch of friendly tone, but data exact and realistic. The in-app
>   assistant is "L Flip", never any AI vendor.
> YOUR EXPERIMENT: quick-reply chips inside the thread vs a persistent bottom
> quick-reply bar. Keep the winner; loser is frame 4.
> Self-evaluation honesty prompt: slower than direct manipulation, transcript is
> superb evidence, typing in a car is bad.

### 10 Ignition dial

> YOUR MECHANISM — "Ignition": starting a drive is turning a key. One huge rotary
> dial dominates the screen, drawn like a car ignition barrel / premium volume knob,
> with detent positions around its arc: OFF (top) -> CHECK (setup summary) -> START
> (spring-loaded, like a real ignition).
> - At CHECK, the arc around the dial carries the setup as radial readouts like gauge
>   complications — car "Mum's Corolla" at 9 o'clock, supervisor "Sarah Whitman" at 12
>   (small note: Guest needs name + licence), odometer 48468 as a curved odometer
>   strip at 3 o'clock, plate link state as an indicator lamp inside the dial.
> - Plates connecting: the dial ring pulses amber, centre reads "Connecting to
>   L-plates…", START detent greyed/locked with a visible lock pawl.
> - Ready: ring solid green, START detent live, a curved arrow showing the twist
>   gesture.
> - Recording: the dial becomes an instrument cluster — elapsed 00:23:45 as the big
>   centre readout, started 15:54, thin green progress ring, stopping = twist back to
>   OFF (red arc segment marks it).
> - Typography: instrument-cluster flavour (tabular numerals, engraved tick marks on
>   the bezel). Draw with CSS/inline SVG.
> YOUR EXPERIMENT: full rotary dial vs a key-in-slot metaphor (a key silhouette
> dragged a quarter-turn). Keep the winner; loser is frame 4.
> Self-evaluation honesty prompt: rotary gestures on glass are awkward,
> undiscoverable detents, but the metaphor teaches itself to drivers.

---

## Round three — interactivity pass (two agents, five files each)

> You are adding a WORKING interactive demo to five existing static design-prototype
> HTML files. Each file is currently a dark canvas page with FOUR static phone frames
> side by side plus a self-evaluation strip. DO NOT modify or remove the four static
> frames or the self-evaluation — they are print evidence.
>
> YOUR JOB, per file: add ONE additional phone frame (~390x844, same bezel styling as
> the file's existing frames) placed BELOW the existing row in its own centered
> section headed "Interactive — try it" (this placement matters: the gallery iframes
> crop to the top of the page and must keep showing the static row unchanged). In this
> new frame, the design's own mechanism actually works, implemented in self-contained
> vanilla JS inside the same file (no external resources, no libraries):
>
> - Shared state machine for all: on load, plate status shows amber "Connecting to
>   L-plates…" and the start control is amber/locked; after ~2.5 s it becomes
>   green/ready. Activating start switches the frame to the recording state with a
>   LIVE ticking elapsed timer and the design's stop control; stopping returns to
>   ready.
> - Per-design behaviours: 01 tap circle = timer; 02 total ring creeps up while
>   recording; 03 stepper actually steps with latching selections, GO gated on
>   plates; 04 route line animates onto the map while recording; 05 ledger row
>   live-fills and writes final figures on stop; 06 start bar with huge live timer;
>   07 thumb genuinely pointer-draggable, commit at ~85%, snap back early, reversed
>   red slide-to-stop; 08 toggles flip on tap, PLATES throws itself on simulated BLE
>   connect, guard opens only with all four up, master switch starts/stops; 09 chips
>   drive a real scripted exchange then a live timestamped log with auto-scroll;
>   10 dial pointer rotates through detents, START locked until ready.
> - Interactions must give feedback (pressed states, transitions).
>
> RULES: no external resources; fully self-contained; no AI attribution; no emoji;
> realistic data consistent with the file. Do not break the existing static content
> or its layout width.
>
> VERIFY each file: render headless (1800x2400) to /tmp, Read the PNG to confirm the
> static row is unchanged and the interactive frame renders in its initial state;
> sanity-check the JS (must not throw on load). Do NOT overwrite the existing
> verification screenshots.
