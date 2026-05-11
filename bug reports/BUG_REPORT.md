# Bug Report — Ionic Driving Log App
**Date:** 2026-04-30
**App URL:** http://localhost:5173
**Backend URL:** http://10.61.1.69:5001
**Report Version:** 2.0 (Combined — Static Analysis + Live Testing)

---

> ## ⚠️ AI-Generated Report Disclaimer
>
> This report was generated automatically by **Claude (Anthropic)**, an AI assistant, using live browser automation. The AI inspected the running application, read source files served by the Vite dev server, interrogated `localStorage` state, simulated offline conditions by intercepting network requests, and tested multi-tab session behaviour in real time.
>
> **What this means for you:**
> - Findings are based on observed runtime behaviour and static source analysis — not manual human code review.
> - The AI may have misread context, missed edge cases, or incorrectly attributed a symptom to the wrong root cause. Each finding should be independently verified by a developer before acting on it.
> - One bug (originally BUG-007) was **incorrectly reported** in a prior version of this document. It has been removed. The AI mistook its own test URL (manually typed) for a real routing failure.
> - Code fix suggestions are illustrative only and may not account for your full architecture.
> - All evidence (localStorage snapshots, console errors, source line references) is included so you can verify findings yourself.
>
> **Testing was conducted with:** Claude Sonnet 4.6 via the Claude browser extension on 2026-04-30.

---

## Table of Contents

### Static Analysis Bugs
1. [BUG-001 — sv_id Hardcoded to 1 (Critical)](#bug-001)
2. [BUG-002 — No Odometer Input Validation (Critical)](#bug-002)
3. [BUG-003 — No Route Guards / Auth Protection (Critical)](#bug-003)
4. [BUG-004 — No Confirmation on Destructive Debug Actions (Medium)](#bug-004)
5. [BUG-005 — Duplicate Supervisor Licence Numbers Allowed (Medium)](#bug-005)
6. [BUG-006 — Sub-Minute Trips Display as 0:00 Duration (Medium)](#bug-006)
7. [BUG-007 — No Error Handling for Geolocation Failures (Low)](#bug-007)
8. [BUG-008 — JWT Token Sent Over Plain HTTP (Low)](#bug-008)
9. [BUG-009 — Silent Empty catch Block in endTrip.vue (Low)](#bug-009)
10. [BUG-010 — start_time Used as Vue List Key Instead of id (Low)](#bug-010)
11. [BUG-011 — AI Disclaimer Alert Fires on Every Mount (Low)](#bug-011)

### Live Testing Bugs (Offline + Multi-Tab)
12. [BUG-012 — Login Fails Offline With No User Feedback (Medium)](#bug-012)
13. [BUG-013 — Settings Page Crashes on Load When Offline (Critical)](#bug-013)
14. [BUG-014 — Ghost Session: Signed-Out Tab Remains Fully Functional (Critical)](#bug-014)
15. [BUG-015 — Second Tab Bypasses Login via Shared Token (Critical)](#bug-015)
16. [BUG-016 — Token Cross-Contamination Between Tabs (Medium)](#bug-016)

---

## Static Analysis Bugs

---

### BUG-001 — sv_id Hardcoded to 1 in startTrip.vue {#bug-001}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/views/startTrip.vue` |
| **Function** | `start()` |
| **Found By** | AI static source analysis |

#### Description
In the `start()` async function, the new trip object is constructed with `sv_id: 1` hardcoded instead of using `selectedSvId.value`. Actual supervisor IDs in the database begin at 3. The supervisor dropdown is rendered and reactive but its value is never written to the trip. Every trip shows blank supervising driver details.

#### Evidence
All 24 pre-existing trips in `localStorage` have `sv_id: 1`. The supervisors table contains IDs 3, 4, 5, 6, 8, 9. On the dashboard, every trip displays:
```
Supervising driver:
Supervising number:
```
Source confirmed:
```typescript
// src/views/startTrip.vue — start() function
const newTrip = {
  sv_id: 1,  // BUG: hardcoded — selectedSvId.value is never used
  ...
};
```

#### Steps to Reproduce
1. Go to **Log Trip**, select any supervisor.
2. Enter start odo and tap **START**.
3. End the trip. View on Dashboard — supervising driver is blank.

#### Fix
```typescript
sv_id: selectedSvId.value,
```

---

### BUG-002 — No Odometer Input Validation {#bug-002}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **Files** | `src/views/startTrip.vue`, `src/views/endTrip.vue` |
| **Found By** | AI static source analysis + localStorage data inspection |

#### Description
Odometer inputs use `inputmode: "numeric"` but `type="text"`, so no browser-level numeric enforcement applies. No application-level validation exists either. This permits: empty submissions (stored as `NaN`), negative values, and numbers exceeding `Number.MAX_SAFE_INTEGER` which causes JavaScript to silently lose precision.

The end-trip check uses strict greater-than (`>`) rather than greater-than-or-equal (`>=`), allowing a trip with `end_odo === start_odo` (0 km) to be saved.

#### Evidence — Corrupted Trips in localStorage

| Trip ID | start_odo | end_odo | Safe Integer? |
|---------|-----------|---------|---------------|
| 18 | 9,879 | 1,342,324,534,523,452,400 | ❌ Precision lost |
| 19 | 87,686 | 876,876,876,876,876,900 | ❌ Precision lost |
| 11 | 1,324 | 1,234,311,234 | ✅ (but nonsensical) |

```typescript
// endTrip.vue — current check allows equal values through
if (start_odo > parseFloat(endOdo.value)) { ... }  // should be >=
```

#### Fix
```typescript
// startTrip.vue
const odoVal = parseFloat(start_odo.value);
if (!start_odo.value || isNaN(odoVal) || odoVal < 0 || !Number.isSafeInteger(odoVal)) {
    alert("Please enter a valid positive odometer reading.");
    return;
}
// endTrip.vue
if (start_odo >= parseFloat(endOdo.value)) {
    alert("End odometer must be greater than start odometer.");
    return;
}
```

---

### BUG-003 — No Route Guards / Auth Protection on Any Route {#bug-003}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/router/index.ts` |
| **Found By** | AI static source analysis + confirmed by live multi-tab testing |

#### Description
The Vue Router has zero global `beforeEach` guards, zero per-route `beforeEnter` guards, and no `meta.requiresAuth` flags. Every page including `/tabs/debug` is navigable without authentication by typing its URL directly.

#### Evidence
```typescript
// router/index.ts — confirmed by AI source read
// No router.beforeEach() exists anywhere in the file.
// All routes:
{ path: "/login" }
{ path: "/log" }         // no guard
{ path: "/endTrip" }     // no guard
{ path: "/tabs/debug" }  // no guard — DELETE ALL TRIPS accessible unauthenticated
{ path: "/tabs/settings" }
```

#### Fix
```typescript
router.beforeEach(async (to) => {
    const publicRoutes = ['/login', '/register'];
    if (publicRoutes.includes(to.path)) return true;
    const { value: token } = await Preferences.get({ key: 'auth_token' });
    if (!token) return '/login';
});
```

---

### BUG-004 — No Confirmation on Destructive Debug Actions + Empty catch {#bug-004}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **File** | `src/views/debug.vue` |
| **Found By** | AI static source analysis |

#### Description
**Delete All Trips** and **Delete All Cars** execute immediately on click with no confirmation dialog. One accidental tap permanently destroys all data. Both functions also have a completely empty `catch {}` block — if the API call fails, the error is silently discarded and the user gets no feedback.

#### Evidence
```typescript
// debug.vue — confirmed by AI source read
const deleteTrips = async () => {
    await CapacitorHttp.delete({ ... });
    alert("Deleted!");
    // catch {} is empty — no error handling
};
// No confirm() call anywhere in the file
```

#### Fix
```typescript
const deleteTrips = async () => {
    if (!confirm("Delete ALL trips permanently? This cannot be undone.")) return;
    try {
        await CapacitorHttp.delete({ ... });
        alert("All trips deleted.");
    } catch (e) {
        alert("Failed to delete trips: " + (e as Error).message);
    }
};
```

---

### BUG-005 — Duplicate Supervisor Licence Numbers Allowed {#bug-005}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **Files** | `src/views/classes/svs.ts`, `src/views/settings.vue` |
| **Found By** | AI localStorage inspection |

#### Description
No uniqueness check is performed before adding a supervisor. `add_sv()` posts directly to the API and cache without checking for existing licence numbers.

#### Evidence
Live localStorage contains two entries for licence `1234567`:
```json
{ "id": 3, "licence_no": "1234567", "nickname": "Test Supervisor" }
{ "id": 9, "licence_no": "1234567", "nickname": "Test Supervisor" }
```

#### Fix
```typescript
async add_sv(sv: Sv) {
    const duplicate = this.svs.value.find(s => s.licence_no === sv.licence_no);
    if (duplicate) throw new Error(`Supervisor with licence ${sv.licence_no} already exists.`);
    // ...
}
```

---

### BUG-006 — Sub-Minute Trips Display as 0:00 Duration {#bug-006}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **Files** | `src/views/dashboard.vue`, `src/views/endTrip.vue` |
| **Found By** | AI localStorage inspection + source analysis |

#### Description
Trips started and ended within the same minute display `0:00` because `Math.floor(ms / 3600000)` and `Math.floor(ms / 60000 % 60)` both floor to zero for durations under 60 seconds. No minimum trip duration is enforced at save time.

#### Evidence

| Trip ID | Actual Duration | Displayed As |
|---------|----------------|--------------|
| 11 | 842 ms | 0:00 |
| 17 | 1,208 ms | 0:00 |
| 18 | 3,909 ms | 0:00 |
| 19 | 1,133 ms | 0:00 |

#### Fix
```typescript
// endTrip.vue — add before saving
const durationMs = Date.now() - tripStartTime;
if (durationMs < 60000) {
    alert("Trip is less than 1 minute. Please check your times.");
    return;
}
```

---

### BUG-007 — No Error Handling for Geolocation Failures {#bug-007}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/startTrip.vue` |
| **Found By** | AI static source analysis |

#### Description
`Geolocation.requestPermissions()` and `getCurrentPosition()` are called with no `try/catch`. If the user denies location permission or GPS is unavailable, an unhandled exception is thrown silently. Observed evidence: all stored trips have only a single GPS entry with `speed: null`, suggesting geolocation may already be silently failing in testing.

#### Fix
```typescript
const getPos = async () => {
    try {
        await Geolocation.requestPermissions();
        return await Geolocation.getCurrentPosition({ timeout: 10000 });
    } catch (e) {
        console.warn("Geolocation failed:", e);
        alert("Could not get location. GPS will not be recorded for this trip.");
        return null;
    }
};
```

---

### BUG-008 — JWT Token Sent Over Plain HTTP {#bug-008}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **Files** | All views making API calls |
| **Found By** | AI static source analysis (VITE_API_URL inspection) |

#### Description
All API requests go to `http://10.61.1.69:5001` over plain HTTP. The JWT Bearer token is transmitted in cleartext headers on every request. On a shared local network this token is trivially interceptable by a passive packet capture.

#### Evidence
```
VITE_API_URL = "http://10.61.1.69:5001"   // confirmed from compiled source
Headers: { "Authorization": "Bearer <jwt>" }
```

#### Fix
Switch to HTTPS (even self-signed for local use) and update `.env`:
```
VITE_API_URL=https://10.61.1.69:5001
```

---

### BUG-009 — Silent Empty catch Block in endTrip.vue {#bug-009}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/endTrip.vue` |
| **Found By** | AI static source analysis |

#### Description
The trip-saving logic is wrapped in `try { ... } catch { }` where the catch block contains zero code. If the API call fails the exception is discarded entirely. The user receives no error message and may incorrectly believe their trip saved successfully.

#### Evidence
```typescript
// Confirmed by AI source read — catch block is empty
try {
    // API save call
} catch {
    // nothing here
} finally {
    // navigation
}
```
This was also confirmed during offline testing (BUG-012) — saving a trip while offline succeeded locally but the API failure produced no user-visible error.

#### Fix
```typescript
} catch (e) {
    console.error("Failed to save trip:", e);
    alert("Trip saved locally. Server sync failed — it will retry when reconnected.");
}
```

---

### BUG-010 — start_time Used as Vue List Key Instead of id {#bug-010}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/dashboard.vue` |
| **Found By** | AI static source analysis |

#### Description
The trip list uses `t.start_time` as the Vue `:key`. If two trips are ever created at the same millisecond (e.g. via seeding or data import), Vue will encounter duplicate keys causing incorrect rendering or missed reactivity updates. The `id` field exists on every trip and is the correct stable unique identifier.

#### Fix
```html
<!-- was: :key="t.start_time" -->
<ion-card v-for="t in trips" :key="t.id">
```

---

### BUG-011 — AI Disclaimer Alert Fires on Every Mount {#bug-011}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/ai.vue` |
| **Found By** | AI static source analysis |

#### Description
The disclaimer alert in `onMounted` fires every single time the AI Chat tab is opened — including when the user switches away and comes back. While the intent to warn users is correct, a blocking `alert()` on every mount is poor UX.

#### Evidence
```typescript
// ai.vue — confirmed by AI source read
onMounted(async () => {
    alert("This is an AI: it can make mistakes. Always fact-check road rules on your state or territory's official websites.");
});
```

#### Fix
Show only once per session using `sessionStorage`:
```typescript
onMounted(async () => {
    if (!sessionStorage.getItem('ai_disclaimer_shown')) {
        alert("This is an AI: it can make mistakes...");
        sessionStorage.setItem('ai_disclaimer_shown', 'true');
    }
});
```

---

## Live Testing Bugs

> The following bugs were discovered through live automated testing — simulating offline mode by intercepting all `fetch` and `CapacitorHttp` calls, and by opening multiple browser tabs with different authentication states. Console exceptions were captured in real time.

---

### BUG-012 — Login Fails Offline With No User Feedback {#bug-012}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **File** | `src/views/login.vue` |
| **Found By** | AI offline simulation testing |

#### Description
When the network is unavailable, pressing **SIGN IN** throws an unhandled exception and the app stays on the login page with absolutely no visible error message. The user has no indication of what went wrong.

#### Evidence — Console exception captured during test
```
[EXCEPTION] TypeError: Network request failed
  at CapacitorHttpPluginWeb.post
  at async signIn (src/views/login.vue:46)
```
The login page remained static with no alert, toast, or loading state change.

#### Steps to Reproduce
1. Disconnect network / disable wifi.
2. Open the app and try to sign in.
3. Nothing happens — no error message shown.

#### Fix
```typescript
try {
    const response = await CapacitorHttp.post({ url: `${API_URL}/api/login`, ... });
    // handle success
} catch (e) {
    alert("Sign in failed. Please check your connection and try again.");
}
```

---

### BUG-013 — Settings Page Crashes on Load When Offline {#bug-013}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/views/settings.vue` |
| **Found By** | AI offline simulation testing |

#### Description
The Settings page calls `Cars.pull_cloud()` and `Svs.pull_cloud()` on mount with no `try/catch`. When offline, these calls throw unhandled exceptions that crash the page's initialisation logic. The page renders its list (from cache) but **all interactive elements stop working** — tapping "Click to add supervisor" or "Click to add car" does nothing. No error is shown to the user.

#### Evidence — Console exception captured during test
```
[EXCEPTION] TypeError: Network request failed
  at CapacitorHttpPluginWeb.get
  at async Cars.pull_cloud (src/views/classes/cars.ts:13)
  at async src/views/settings.vue:48
```

#### Steps to Reproduce
1. Go offline.
2. Navigate to **Settings**.
3. The list of existing cars and supervisors appears (from cache).
4. Tap **Click to add supervisor** — modal does not open.
5. Tap **Click to add car** — modal does not open.

#### Fix
```typescript
// settings.vue onMounted
try {
    await cars.pull_cloud();
    await svs.pull_cloud();
} catch (e) {
    console.warn("Could not sync from server, using cached data:", e);
    // App continues with cached data — no crash
}
```

---

### BUG-014 — Ghost Session: Signed-Out Tab Remains Fully Functional {#bug-014}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/router/index.ts`, all views |
| **Found By** | AI multi-tab session testing |

#### Description
When a user signs out on one tab, the auth token is deleted from `localStorage` — but any other tab that was already open **continues to work indefinitely** without any re-authentication check. The ghost tab can browse all pages, start trips, modify settings, and access the debug page, all using an invalidated in-memory session.

#### Evidence
Test sequence performed by AI:
1. Tab 1 signed out via Debug → SIGN OUT. Token deleted from `localStorage`.
2. Tab 2 (open on Dashboard) was checked immediately after.
3. Result: Tab 2 still showed the full Dashboard. Token confirmed absent from `localStorage` (`null`).
4. Tab 2 could freely navigate to any route.

#### Fix
Add a `storage` event listener to detect when `auth_token` is removed by another tab:
```typescript
// main.ts or App.vue
window.addEventListener('storage', (e) => {
    if (e.key === 'CapacitorStorage.auth_token' && !e.newValue) {
        router.push('/login');
    }
});
```

---

### BUG-015 — Second Tab Bypasses Login via Shared Token {#bug-015}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/router/index.ts` |
| **Found By** | AI multi-tab session testing |

#### Description
Opening a second browser tab while already logged in causes the app to immediately redirect to the Dashboard, skipping the login page entirely. This is a direct consequence of BUG-003 (no route guards) — on load, the router checks nothing, the app reads the existing token from `localStorage`, and proceeds. This is expected behaviour for a single-user local app but becomes problematic combined with BUG-014.

#### Evidence
Test sequence performed by AI:
1. Tab 1 was logged in and on Dashboard.
2. New Tab 2 was opened and navigated to `http://localhost:5173/#/login`.
3. Tab 2 immediately redirected to `/#/tabs/dashboard` without entering credentials.

#### Fix
This is resolved as a side-effect of fixing BUG-003 — once route guards check the token on every navigation, the redirect logic can also verify whether the token is still valid with the server.

---

### BUG-016 — Token Cross-Contamination Between Tabs {#bug-016}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **File** | All views writing to `CapacitorStorage.auth_token` |
| **Found By** | AI multi-tab session testing |

#### Description
Because `localStorage` is shared across all tabs of the same origin, logging in on Tab 2 overwrites the `auth_token` previously held by Tab 1. Tab 1 then silently starts using Tab 2's token without any notification or re-authentication prompt. If Tab 1 later makes API calls, they are made using a token that belongs to a different login session. This also means signing in on one tab can break API calls in-flight on another tab.

#### Evidence
Test sequence performed by AI:
1. Tab 1 was signed in (original token, length 119 chars).
2. Tab 1 signed out — token cleared.
3. Tab 2 signed in as **bob** — new token written to `localStorage`.
4. Tab 1 (on login page) was found to already have bob's token in `localStorage`.
5. Tab 1 navigated directly to Dashboard and gained full access using bob's credentials — with no login prompt.

#### Fix
For a single-user Capacitor app this is largely expected behaviour, but cross-tab interference can be mitigated by listening for storage changes and reacting accordingly (see BUG-014 fix). If multi-user support on the same device is ever needed, consider scoping storage keys by user ID.

---

## Summary Table

| Bug ID | Severity | Category | File(s) | Issue |
|--------|----------|----------|---------|-------|
| BUG-001 | 🔴 Critical | Static | startTrip.vue | sv_id hardcoded to 1 — supervisor never saved |
| BUG-002 | 🔴 Critical | Static | startTrip.vue, endTrip.vue | No odometer validation — NaN, negatives, integer overflow |
| BUG-003 | 🔴 Critical | Static | router/index.ts | Zero route guards — all pages accessible without login |
| BUG-004 | 🟠 Medium | Static | debug.vue | No confirmation on delete + empty catch block |
| BUG-005 | 🟠 Medium | Static | svs.ts, settings.vue | Duplicate supervisor licence numbers allowed |
| BUG-006 | 🟠 Medium | Static | dashboard.vue, endTrip.vue | Sub-minute trips show 0:00 — no minimum duration |
| BUG-007 | 🟡 Low | Static | startTrip.vue | No error handling for geolocation failures |
| BUG-008 | 🟡 Low | Static | All API call sites | JWT token sent over plain HTTP |
| BUG-009 | 🟡 Low | Static | endTrip.vue | Silent empty catch block — failed saves give no feedback |
| BUG-010 | 🟡 Low | Static | dashboard.vue | start_time used as list key instead of id |
| BUG-011 | 🟡 Low | Static | ai.vue | AI disclaimer alert fires on every tab mount |
| BUG-012 | 🟠 Medium | Live Test | login.vue | Login fails offline with zero user feedback |
| BUG-013 | 🔴 Critical | Live Test | settings.vue | Settings crashes on load when offline — add/edit UI breaks |
| BUG-014 | 🔴 Critical | Live Test | router/index.ts | Ghost session — signed-out tab stays functional |
| BUG-015 | 🔴 Critical | Live Test | router/index.ts | Second tab bypasses login via shared localStorage token |
| BUG-016 | 🟠 Medium | Live Test | All auth-writing views | Token cross-contamination between tabs |

**Total: 16 bugs** — 6 Critical, 5 Medium, 5 Low

---

## AI Accuracy Notes

The following finding from a prior draft was **incorrect** and has been removed:

> ~~BUG-007 (original) — /tabs/chat route not registered~~


The AI initially reported the AI Chat tab route as broken after observing a Vue Router warning for `/tabs/chat`. Investigation revealed the warning was caused by the AI itself manually navigating to `/tabs/chat` during testing. The actual route is correctly registered at `/tabs/ai` in both `router/index.ts` and `Tabs.vue`, and the page functions correctly. This error has been corrected in this version of the report.

This illustrates the importance of human verification of AI-generated reports.

---

## Supplemental Findings — Second Static Pass (2026-04-30)

> A second static review by Claude (Opus 4.7) reading `register.vue`, `login.vue`, `dashboard.vue`, `startTrip.vue`, `settings.vue`, and `classes/svs.ts` directly from disk. Bugs below are *new* findings not covered above.

---

### BUG-017 — Register: Broken `<select>` Nested Inside `<ion-select>`, with Typo `slot="lable"` {#bug-017}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/views/register.vue` (lines 13–24) |
| **Found By** | Static source review |

#### Description
A native HTML `<select v-model="state" slot="lable">` is rendered *inside* an `<ion-select>`, with the slot name misspelled (`lable` → should be `label`, and Ionic 7 uses the `label` *prop*, not a slot). The inner native `<select>` shadows the outer Ionic component's value binding. The resulting markup is structurally invalid; depending on Ionic's rendering, the `state` ref may never receive the user's selection at all.

#### Fix
```vue
<ion-select v-model="state" label="State" placeholder="Select state" interface="popover">
  <ion-select-option value="act">ACT</ion-select-option>
  <!-- ... -->
</ion-select>
```
Remove the inner `<select>` entirely.

---

### BUG-018 — Register: Redirects to `/login` After Successful Signup Despite Already Holding Token {#bug-018}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **File** | `src/views/register.vue` (line 81) |
| **Found By** | Static source review |

#### Description
`signUp()` calls `signIn()` (which writes the auth token to Preferences) and `add_info()`, then `router.push('/login')`. The user is forced back through the login screen even though they are already authenticated. The trailing comment ("login will cashe all need data and then redirect you to /tabs/dasbord") indicates this is a workaround for caching, but the correct place to pull cached data is after a successful signup, not by re-routing through the login form.

Additionally, neither `signIn()` nor `add_info()` check their response status — a failed login or a failed `set_licence` call is silently ignored, but the user is still pushed to `/login` and may appear authenticated with incomplete server state.

#### Fix
After signup, await `carsStore.pull_cloud()` / `svsStore.pull_cloud()` and push directly to `/tabs/dashboard`. Surface failures from `signIn` / `add_info` to the user.

---

### BUG-019 — startTrip: GPS Position Captured but Never Saved to Trip {#bug-019}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/views/startTrip.vue` (lines 65, 81, 85–91) |
| **Found By** | Static source review |

#### Description
The trip object is initialised with `gps: []`, then `getPos()` is called *after* `Preferences.set` writes the trip. `getPos()` only `console.log`s the position — it never appends to `newTrip.gps` or persists the coordinate. Every saved trip therefore has an empty `gps` array. This is the actual root cause of the "single GPS entry / `speed: null`" symptom hypothesised in BUG-007.

#### Evidence
```typescript
const newTrip = { ..., gps: [], ... }
trips.push(newTrip)
await Preferences.set({ key:'trips', value: JSON.stringify(trips) })
getPos()  // fire-and-forget; result discarded
```

#### Fix
```typescript
const pos = await getPos();
if (pos) newTrip.gps.push({ lat: pos.coords.latitude, lon: pos.coords.longitude, time: Date.now() });
// then persist trips
```

---

### ~~BUG-020 — Dashboard: `pullTrips` Overwrites Local Trips~~ — **WITHDRAWN**

This finding was **incorrect**. The author confirmed the server is the intended source of truth: `uploadTrips` pushes any unsynced trips first, the server then has the authoritative copy, and `pullTrips` re-downloads everything (now including the just-uploaded trips). Overwriting local state with the server's response is by design, not a data-loss bug.

The only residual concern — what happens if `uploadTrips` fails and `pullTrips` then runs — is partly addressed by `pullTrips` returning early on non-200, but a network-level failure mid-flow could still drop a local-only trip. If the author wants belt-and-braces protection there, gate `pullTrips` on `uploadTrips` succeeding; otherwise this is working as intended.

---

### BUG-021 — Dashboard: Sync Status Icon Shows "Offline" Pre-Emptively and Never Recovers on Failure {#bug-021}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/dashboard.vue` (lines 96–113) |
| **Found By** | Static source review |

#### Description
`status.value = "📵"` is set *before* the `CapacitorHttp.post` call inside the upload loop, so the user sees the "offline" indicator on every sync attempt even when the network is fine. When a request fails (non-200), the function `return false`s without resetting `status`, leaving the UI stuck on 📵 indefinitely. Only the last branch (`status.value = '✅'`) is reachable when *every* trip uploads successfully.

#### Fix
Track sync state explicitly: set `🔄` while attempting, `✅` on success, `📵`/`⚠️` on failure — assign after observing the outcome, not before.

---

### BUG-022 — Login: Imports Nonexistent `warn` from `vue` {#bug-022}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/login.vue` (line 20) |
| **Found By** | Static source review |

#### Description
```typescript
import { ref, warn } from 'vue'
```
`warn` is not a public export of the `vue` package (the runtime helper lives in `@vue/runtime-core` internals). Under strict bundler settings this resolves to `undefined`; under stricter type-checking it is a build error. `warn` is never used in the file — dead import.

#### Fix
Remove `, warn` from the import.

---

### BUG-023 — Login: `isAuth` Calls API With `Bearer null` When No Token Is Present; pull_cloud Runs After Failed Login {#bug-023}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **File** | `src/views/login.vue` (lines 33–46, 76–77) |
| **Found By** | Static source review |

#### Description
`isAuth()` reads `auth_token`, then unconditionally posts to `/api/dashboard` even when `token` is `null`, sending `Authorization: Bearer null`. This is wasted traffic, pollutes server logs, and produces confusing 401s on the login screen.

In addition, `signIn()` runs `carsStore.pull_cloud()` and `svsStore.pull_cloud()` **outside** the `if (response.status === 200)` block — both fire after a *failed* login, leaking unauthenticated requests and potentially clobbering cached data with empty results.

#### Fix
```typescript
const isAuth = async () => {
  const { value: token } = await Preferences.get({ key: 'auth_token' })
  if (!token) return
  // ...
}

if (response.status === 200) {
  await Preferences.set({ key: 'auth_token', value: response.data.token })
  await fetchState()
  await carsStore.pull_cloud()
  await svsStore.pull_cloud()
  router.push('/tabs/dashboard')
}
```

---

### BUG-024 — Settings: `signOut` Uses `Preferences.clear()` — Wipes Unsynced Local Trips {#bug-024}

| Field | Details |
|-------|---------|
| **Severity** | 🔴 Critical |
| **File** | `src/views/settings.vue` (line 116) |
| **Found By** | Static source review |

#### Description
`signOut` calls `await Preferences.clear()`, which deletes **every** Preferences key — including `trips`, `night`, `total`, cached `cars`, and cached `svs`. If the user has any unsynced trips (synced flag false because of an earlier upload failure), signing out destroys them with no recovery path. The "must be online" check does not prevent this — even online, a trip queued from earlier offline use can be wiped before the next dashboard load gets a chance to flush it.

#### Fix
Remove only the auth-related keys, and force a sync flush before clearing:
```typescript
async function signOut() {
  if (!navigator.onLine) { alert("Go online to sign out cleanly."); return; }
  // optionally: await uploadTrips() and bail if any remain unsynced
  await Preferences.remove({ key: 'auth_token' })
  await Preferences.remove({ key: 'total' })
  await Preferences.remove({ key: 'night' })
  router.push('/')
}
```

---

### BUG-025 — startTrip: Dead Node-Only Import `import { log } from 'console'` {#bug-025}

| Field | Details |
|-------|---------|
| **Severity** | 🟡 Low |
| **File** | `src/views/startTrip.vue` (line 43) |
| **Found By** | Static source review |

#### Description
```typescript
import { log } from 'console';
```
`'console'` is a Node.js built-in module, not a browser global. Vite will either polyfill, warn, or fail to resolve depending on configuration. `log` is never referenced in the file — IDE auto-import artefact.

#### Fix
Delete the line.

---

### BUG-026 — startTrip: `<ion-select-option value="null">` Sends the *String* `"null"` Into Numeric `selectedCarId` / `selectedSvId` {#bug-026}

| Field | Details |
|-------|---------|
| **Severity** | 🟠 Medium |
| **File** | `src/views/startTrip.vue` (lines 13, 23) |
| **Found By** | Static source review |

#### Description
The "Guest Car" / "Guest Driver" options bind `value="null"` — a quoted string literal, not the JS `null`. When the user picks one of these, `selectedCarId` (typed `number | null`) becomes the string `"null"`. The resulting trip then has `car_id: "null"` / `sv_id: "null"`, which (a) violates the declared type, (b) fails strict-equality lookups in `carsStore.get_car_by_id(id)` / `svsStore.get_sv_by_id(id)` (compare against numeric ids), and (c) will likely be rejected or coerced unpredictably by the backend.

#### Fix
Bind the actual `null` — use the dynamic prop syntax:
```vue
<ion-select-option :value="null">Guest Car</ion-select-option>
<ion-select-option :value="null">Guest Driver</ion-select-option>
```

---

## Updated Summary

| Bug ID | Severity | Category | File(s) | Issue |
|--------|----------|----------|---------|-------|
| BUG-017 | 🔴 Critical | Static (2nd pass) | register.vue | Broken nested `<select>` + `slot="lable"` typo — state never bound |
| BUG-018 | 🟠 Medium | Static (2nd pass) | register.vue | Signup redirects through `/login` instead of dashboard |
| BUG-019 | 🔴 Critical | Static (2nd pass) | startTrip.vue | GPS position fetched but never written to trip — all trips lose GPS |
| BUG-020 | 🔴 Critical | Static (2nd pass) | dashboard.vue | `pullTrips` overwrites unsynced local trips on every load |
| BUG-021 | 🟡 Low | Static (2nd pass) | dashboard.vue | Sync status icon set pre-emptively, never reset on failure |
| BUG-022 | 🟡 Low | Static (2nd pass) | login.vue | Imports nonexistent `warn` from `vue` |
| BUG-023 | 🟠 Medium | Static (2nd pass) | login.vue | `isAuth` posts `Bearer null`; pull_cloud runs after failed login |
| BUG-024 | 🔴 Critical | Static (2nd pass) | settings.vue | `signOut` uses `Preferences.clear()`, destroys unsynced trips |
| BUG-025 | 🟡 Low | Static (2nd pass) | startTrip.vue | Dead `import { log } from 'console'` (Node-only module) |
| BUG-026 | 🟠 Medium | Static (2nd pass) | startTrip.vue | Guest option binds string `"null"` instead of `null`, breaks lookups |

**Updated total: 26 bugs** — 10 Critical, 8 Medium, 8 Low.
