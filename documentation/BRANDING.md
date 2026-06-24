# L Flip — Branding & Style Guide

L Flip is the pocket logbook for learner drivers. The visual identity is built
around the colours of an Australian L-plate: high-contrast red, yellow and
green on dark, with a deep blue/purple as the app's primary accent.

## Colour palette

| Name             | Swatch | Hex       | RGB              | Usage |
|------------------|--------|-----------|------------------|-------|
| Primary (Blue)   | 🟦     | `#4232B4` | 66, 50, 180      | Primary actions, links, active states, brand accent |
| Dark             | ⬛     | `#1D1D1D` | 29, 29, 29       | Tab bar, toolbars, body text, "night" data |
| Green            | 🟩     | `#36A225` | 54, 162, 37      | Start trip / success / "total hours" |
| Yellow           | 🟨     | `#C5BF10` | 197, 191, 16     | L-plate badge, warnings, "day hours" |
| Red              | 🟥     | `#B90413` | 185, 4, 19       | Errors, destructive actions, danger states |
| Light background | ⬜     | `#F4F4F4` | 244, 244, 244    | App background |
| Medium grey      | ◽     | `#8B8B8B` | 139, 139, 139    | Inactive icons/labels, secondary text |

These are defined as CSS custom properties in
[`src/theme/variables.css`](../src/theme/variables.css):

```css
--lp-red: #b90413;
--lp-yellow: #c5bf10;
--lp-green: #36a225;
--lp-dark: #1d1d1d;
--lp-blue: #4232b4;
```

They are also mapped onto the standard Ionic colour roles:

| Ionic role  | Mapped to    |
|-------------|--------------|
| `primary`   | Blue `#4232B4` |
| `secondary` | Dark `#1D1D1D` |
| `tertiary`  | Yellow `#C5BF10` |
| `success`   | Green `#36A225` |
| `warning`   | Yellow `#C5BF10` |
| `danger`    | Red `#B90413` |
| `dark`      | Dark `#1D1D1D` |

## Logo / badge

The brand mark is an "L-plate" badge: a rounded-square yellow tile with a bold,
condensed black "L" (`font-family: Impact, sans-serif`). It is used as:

- The browser favicon (`public/favicon.svg`)
- The hero badge on the marketing page (`src/views/marketing.vue`)

```html
<div class="badge">L</div>
```

```css
.badge {
  border-radius: 24px;
  background: #ffd60a;
  color: #1a1a2e;
  font-weight: 900;
  font-family: Impact, sans-serif;
}
```

## Start-trip icon

The "Start" tab uses a Strava-style record icon — a ring with a filled green
dot — instead of the L-plate badge:

```html
<div class="lp-record-icon">
  <span class="lp-record-dot"></span>
</div>
```

## Charts (dashboard)

Pie charts on the dashboard use the palette so the data reads at a glance:

- **Day hours** → Yellow `#C5BF10`
- **Night hours** → Dark `#1D1D1D`
- **Total hours** → Green `#36A225`
- Remaining/empty portion → Light grey `#E0E0E0`

## Components & layout

- **Corner radius** — `14px` (`--lp-radius`), applied to cards, items and
  buttons for a soft, consistent look.
- **Cards** — white background, subtle shadow (`0 2px 8px rgba(0,0,0,0.08)`).
- **Form fields** — use `ion-item` with `stacked` labels for selects (avoids
  label/placeholder overlap) and `floating` labels for text inputs.
- **Buttons** — no uppercase text transform, `font-weight: 600`, rounded to
  match `--lp-radius`.
- **Tab bar** — dark (`#1D1D1D`) background, inactive icons/labels in medium
  grey, active colour green (`var(--lp-green)`). Every tab has an icon **and**
  a label.

## Tone

Friendly, encouraging and a bit playful (learner-driver focused), but data and
forms stay clean and legible — no clutter, generous spacing, and colour used
purposefully to highlight status (day/night/total, success/warning/danger).
