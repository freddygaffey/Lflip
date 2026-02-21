# Prompt Plan — Phases 1, 2, 3

Copy and paste these prompts to an AI assistant to implement each step. Run them in order.

---

## Phase 1: Parent Approval UI

### Prompt 1.1 — Create ParentApprovals page

```
Create a new page component ParentApprovals.jsx in src/pages/. It should:
- Use the useLogbook hook to fetch trips
- Filter to trips with approvalState === 'pending'
- Display each pending trip in a card showing: date (formatDate), duration (formatHoursMinutes), supervisor name, weather icon
- Each card has two buttons: "Approve" and "Reject"
- On Approve: call apiService.approveTrip(tripId, true), then refresh the list
- On Reject: call apiService.approveTrip(tripId, false), then refresh the list
- Show loading state while fetching
- If no pending trips, show "No trips need approval" message
- Use the same styling as other pages (Tailwind, dark mode support, rounded cards)
- Import formatDate, formatTime, formatHoursMinutes from utils/formatTime.js
```

### Prompt 1.2 — Add route and navigation

```
Add the ParentApprovals page to the app:
1. In App.jsx, add a route: <Route path="/approvals" element={<ParentApprovals />} />
2. In TabBar.jsx, add a new tab: { path: '/approvals', icon: '✓', label: 'Approvals' }
3. Make sure the approvals tab is visible (not hidden on active/start/stop pages)
```

### Prompt 1.3 — Add Rejected badge to TripCard

```
In TripCard.jsx, add a badge for when approvalState === 'rejected'. Currently it shows "pending" and "approved". Add:
- When trip.approvalState === 'rejected', show a red "Rejected" badge (text-red-500, text-xs)
- Use the same placement as the existing approval badges (top right of the card)
```

### Prompt 1.4 — Approval column in NSW logbook table (optional)

```
In TripHistory.jsx, when nswFormat is true, add an "Approval" column to the table:
- Add <th>Approval</th> in the header row
- Add <td> in each body row showing: "—" if no approvalState, "Approved" if approved, "Pending" if pending, "Rejected" if rejected
- Style Approved green, Pending amber, Rejected red
```

---

## Phase 2: Auth Basics

### Prompt 2.1 — Create Login page

```
Create a new Login.jsx page in src/pages/ that:
- Has a form with email (type email) and password (type password) inputs
- Has a "Log in" button that calls useAuth().login(email, password)
- On success: navigate to "/"
- On error: show the error message below the form (red text)
- Has a "Register" link or tab that shows register form (name, email, password) and calls apiService.register
- Uses the app's existing styling (Tailwind, dark mode, rounded inputs, btn-primary for submit)
- Centres the form on the page, max-width so it looks good on mobile and desktop
```

### Prompt 2.2 — Route protection and redirect

```
Update App.jsx to require login:
1. Create a wrapper component or use a pattern where: if useAuth().user is null, render a redirect to /login (or the Login component) instead of the main app
2. The Login and Register pages should NOT require auth (no redirect loop)
3. After successful login, the user should see the Dashboard
4. Use Navigate from react-router-dom to redirect: <Navigate to="/login" replace /> when not logged in
```

### Prompt 2.3 — Persist token and restore session

```
Make login persist across app reloads:
1. In AuthContext: on mount, check if there's a saved token. Use apiService or a new getStoredAuth / restoreSession method.
2. The mock API (api.mock.js) already stores authToken in Preferences. Add a method getCurrentUser or validateToken that: if authToken exists, return { userId, name } (or similar) so AuthContext can set user on app load.
3. In AuthContext, call this on initial render (useEffect) and if valid, setUser with the stored user info.
4. Ensure logout clears the stored token (apiService should have or need a logout/clearToken method).
```

### Prompt 2.4 — Logout button

```
In Settings.jsx, add a Logout button:
- In the Profile or a new "Account" section, add a "Log out" button
- On click: call useAuth().logout(), then navigate to /login
- Style it consistently (e.g. red/destructive style for logout)
```

### Prompt 2.5 — Mock API: return role from login/register

```
Update api.mock.js so login and register return a role:
- If email contains "parent" (e.g. parent@demo.com), return role: "parent"
- Otherwise return role: "learner"
- Store the role in the auth response. AuthContext should store user as { name, userId, role }.
- Update AuthContext's login to include role in the user object from the auth response.
```

---

## Phase 3: Role-Based UI

### Prompt 3.1 — Ensure role is in AuthContext user

```
In AuthContext.jsx, ensure the user object from login includes role:
- setUser({ name: auth.name, userId: auth.userId, role: auth.role })
- The useAuth hook already returns user; components can use user?.role
```

### Prompt 3.2 — Show Approvals tab only for parent

```
In TabBar.jsx, show the Approvals tab only when the user has role "parent":
- Import useAuth
- Filter the TABS array (or conditionally include the approvals tab) so it only appears when useAuth().user?.role === 'parent'
- Learners will not see the Approvals tab; parents will.
```

### Prompt 3.3 — ParentApprovals: redirect non-parents (optional)

```
In ParentApprovals.jsx, add a guard: if the user is logged in but role is not "parent", show a message like "Only parents can approve trips" or redirect to "/". Use useAuth and useNavigate.
```

### Prompt 3.4 — Optional: different dashboard for parent vs learner

```
In Dashboard.jsx, show slightly different content based on role:
- If user.role === 'parent': emphasise "Approve trips" or a shortcut to /approvals, and maybe hide or downplay the Start trip flow (or show "Your linked learners' trips")
- If user.role === 'learner': show the current dashboard (Start trip, progress, etc.)
- Keep it simple: a conditional section or link is enough.
```

---

## Quick Checklist

After running all prompts:

- [ ] Phase 1: ParentApprovals page exists, route works, Approve/Reject updates trips, badges show
- [ ] Phase 2: Login page exists, route protection works, token persists, logout works, role returned
- [ ] Phase 3: Approvals tab only for parent, learner sees standard tabs
