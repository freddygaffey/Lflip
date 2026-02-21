# L-Plate Tracker — Implementation Order

A suggested order to implement features, with demoable milestones at each phase. Focus on mock-first, then backend, then real hardware.

---

## Phase 1: Parent Approval (No Auth Yet)

**Goal:** Parents can approve trips. Works with existing mock; no login required.

| # | Task | Files | Demo |
|---|------|-------|------|
| 1 | Create ParentApprovals page | `pages/ParentApprovals.jsx` | List pending trips, Approve/Reject buttons |
| 2 | Add route + nav link | `App.jsx`, `TabBar.jsx` or `Settings.jsx` | Can open Approvals from nav |
| 3 | Add "Rejected" badge to TripCard | `TripCard.jsx` | Shows rejected state |
| 4 | (Optional) Approval column in NSW table | `TripHistory.jsx` | Logbook table shows approval |

**Milestone:** Parent can approve/reject trips. Trip badges update. All with mock data.

---

## Phase 2: Auth Basics

**Goal:** Login screen, token persistence, user in context.

| # | Task | Files | Demo |
|---|------|-------|------|
| 1 | Create Login page | `pages/Login.jsx` | Email + password form |
| 2 | Add route + redirect logic | `App.jsx` | If no user → Login; if user → Dashboard |
| 3 | Persist token on login | `AuthContext` + mock API | Reload app, still logged in |
| 4 | Logout button | `Settings.jsx` | Log out, back to Login |
| 5 | Mock: return role from login | `api.mock.js` | e.g. parent@demo.com → parent, else learner |

**Milestone:** Can log in, stay logged in, log out. Role available for next phase.

---

## Phase 3: Role-Based UI

**Goal:** Parents see Approvals; learners see logging. Same app, different views.

| # | Task | Files | Demo |
|---|------|-------|------|
| 1 | Add role to user in AuthContext | `AuthContext.jsx` | `user.role` available |
| 2 | Show Approvals tab only for parent | `TabBar.jsx` | Parent sees Approvals, learner doesn't |
| 3 | Optional: learner vs parent dashboard | `Dashboard.jsx` | Different hero or links |
| 4 | ParentApprovals: only show for parent | `ParentApprovals.jsx` | Redirect learner away if needed |

**Milestone:** Login as learner → logging flow. Login as parent → Approvals flow.

---

## Phase 4: Mock Pairing (QR)

**Goal:** Kid creates QR, parent scans, accounts linked. All with mock API.

| # | Task | Files | Demo |
|---|------|-------|------|
| 1 | Add `createPairingToken`, `completePairing`, `getLinkedLearners` to mock API | `api.mock.js` | Pairing works in mock |
| 2 | Create PairWithParent page (learner) | `pages/PairWithParent.jsx` | Shows QR with token |
| 3 | Install `qrcode` for generating QR | `package.json` | QR renders |
| 4 | Create ScanToPair page (parent) | `pages/ScanToPair.jsx` | Scan kid's QR |
| 5 | Install `@capacitor-community/barcode-scanner` | `package.json` | Camera scans QR |
| 6 | Wire nav: learner → PairWithParent, parent → ScanToPair | TabBar, Settings | Both flows reachable |
| 7 | Filter trips by linked learners | `api.mock.js` getTrips | Parent sees only linked kid's trips |

**Milestone:** Full pairing flow works with mock. Parent approves only linked kid's trips.

---

## Phase 5: Backend (Flask)

**Goal:** Real API and database replace mock.

| # | Task | Files | Demo |
|---|------|-------|------|
| 1 | Scaffold Flask app + SQLite | `backend/` or new repo | API runs locally |
| 2 | Implement auth endpoints | register, login, me | Can log in via real API |
| 3 | Implement trips CRUD + approve | trips endpoints | Trips persist in DB |
| 4 | Implement supervisors, cars | supervisors, cars | Full CRUD |
| 5 | Implement pairing endpoints | pair/create, pair/complete | Pairing works |
| 6 | Implement logbook summary | logbook/summary | Summary from DB |
| 7 | Switch app to RealApiService | `config.js` USE_MOCK = false | App uses Flask |
| 8 | Fix any mismatches | App + API | Full flow works |

**Milestone:** App talks to Flask. Data persists. No mock.

---

## Phase 6: Real BLE + ESP32 (Optional for HSC)

**Goal:** Actual BLE connection to ESP32 for odometer.

| # | Task | Files | Demo |
|---|------|-------|------|
| 1 | Implement ble.real.js | `services/ble/ble.real.js` | Scan, connect, send commands |
| 2 | ESP32 firmware: BLE service | ESP32 project | Advertises, responds to commands |
| 3 | Test on device | Android/iOS | Phone ↔ ESP32 over BLE |
| 4 | Odometer transfer at trip end | ble.real.js + ESP32 | startOdo, endOdo received |

**Milestone:** Real odometer from car. Manual USB flash for ESP32 is fine for HSC.

---

## Phase 7: Polish (If Time)

- Web vs mobile layout (platform detection, different shells)
- ESP32 OTA (GitHub Actions + in-app update)
- Better error handling, loading states
- Deploy web app + API

---

## Quick Reference: What Order?

```
1. Parent Approval UI     ← Start here (easiest, high impact)
2. Auth (login screen)
3. Role-based UI
4. Mock pairing (QR)
5. Flask backend
6. Real BLE + ESP32
7. Polish
```

---

## Suggested Next Step

**Do Phase 1 first.** It's the smallest change with immediate value:
1. Create `ParentApprovals.jsx`
2. Add route and a link (e.g. in TabBar or Settings)
3. Wire approve/reject to `apiService.approveTrip()`

No auth changes, no pairing, no backend. Just the approval UI. You can demo it in one session.
