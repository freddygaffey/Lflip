# Parent Approval (RBA) — Implementation Guide

This guide walks through building the parent approval feature so parents can approve or reject their kids' driving trips in the L-Plate Tracker app.

---

## 1. What Already Exists

| Component | Location | Status |
|-----------|----------|--------|
| Trip model | `src/models/trip.js` | Has `approvalState`, `approvedBy`, `approvedAt` |
| API mock | `src/services/api/api.mock.js` | `approveTrip(tripId, approved)` works |
| TripCard | `src/components/TripCard.jsx` | Shows pending/approved badges |
| AuthContext | `src/context/AuthContext.jsx` | Basic login; no parent/learner role yet |
| Seed trips | `src/utils/seedData.js` | First 3 trips approved, last 2 pending |

---

## 2. Implementation Steps

### Step 2.1 — Add Parent Approvals Route

Add a new route in `App.jsx` for the parent approval screen:

```jsx
<Route path="/approvals" element={<ParentApprovals />} />
```

Import `ParentApprovals` from the new page component.

---

### Step 2.2 — Create ParentApprovals Page

**File:** `src/pages/ParentApprovals.jsx`

**Purpose:** List trips needing approval and allow approve/reject per trip.

**Structure:**
- Use `useLogbook({})` to fetch trips
- Filter to `approvalState === 'pending'` (or show all with pending highlighted)
- Display each trip in a card/row with: date, duration, supervisor, approve button, reject button
- Call `apiService.approveTrip(tripId, true)` or `apiService.approveTrip(tripId, false)` on button click
- Refresh list after approval

**Key logic:**
```js
const { trips, loading, refresh } = useLogbook({});
const pending = trips.filter(t => t.approvalState === 'pending');

const handleApprove = async (tripId, approved) => {
  await apiService.approveTrip(tripId, approved);
  refresh();
};
```

---

### Step 2.3 — Add Navigation to Parent Approvals

**Option A — TabBar (mobile):** Add an Approvals tab in `TabBar.jsx` (e.g. parent sees it when logged in as parent).

**Option B — Settings link:** Add "Approve trips" link in `Settings.jsx` that navigates to `/approvals`.

**Option C — Both:** Tab on mobile for parents, link in Settings as fallback.

---

### Step 2.4 — Optional: Parent vs Learner Role

For a simple HSC demo, you can skip roles and let any logged-in user see the approvals page. For a fuller solution:

1. Add `role: 'parent' | 'learner'` to AuthContext user (mock API returns it).
2. In `api.mock.js` `login()`, add `role: email.includes('parent') ? 'parent' : 'learner'` for demo.
3. Conditionally show Approvals tab only when `user?.role === 'parent'`.
4. Or: show Approvals to everyone (parent uses parent@email.com to log in).

---

### Step 2.5 — Show Rejected State in TripCard

`TripCard.jsx` already shows `pending` and `approved`. Add handling for `rejected`:

```jsx
{trip.approvalState === 'rejected' && <span className="text-xs text-red-500">Rejected</span>}
```

---

### Step 2.6 — Add Approval Column to NSW Logbook Table

In `TripHistory.jsx`, add an "Approval" column to the NSW logbook table (when `nswFormat` is true):

- Show `—`, `Approved`, `Pending`, or `Rejected` per trip

---

### Step 2.7 — Seed Data (already done)

`createSeedTrips()` sets `approvalState: idx < 3 ? 'approved' : 'pending'` — first 3 approved, last 2 pending. No changes needed.

---

## 3. File Checklist

| Task | File | Action |
|------|------|--------|
| Route | `App.jsx` | Add `/approvals` route |
| Page | `src/pages/ParentApprovals.jsx` | Create new page |
| Nav | `TabBar.jsx` or `Settings.jsx` | Add link to Approvals |
| Badge | `TripCard.jsx` | Add rejected badge |
| Table | `TripHistory.jsx` | Add approval column (optional) |

---

## 4. API Contract (for Real Backend Later)

When you switch to `RealApiService`, ensure the Flask API implements:

```
PATCH /api/trips/<tripId>/approve
Body: { "approved": true | false }
Response: { "success": true }
```

Trip response must include: `approvalState`, `approvedBy`, `approvedAt`.

---

## 5. Testing Checklist

- [ ] ParentApprovals page loads
- [ ] Pending trips are listed
- [ ] Approve button updates trip to approved
- [ ] Reject button updates trip to rejected
- [ ] TripCard shows correct approval badge
- [ ] Refreshing logbook shows updated approval state
- [ ] Works with mock API (USE_MOCK = true)
