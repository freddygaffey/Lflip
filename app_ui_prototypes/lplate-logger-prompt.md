# L-Plate Logger — UI Prototype Generator Prompt

You are designing a UI prototype for **L-Plate Logger**, an Australian learner driver hours tracking app. This is a **UI prototype only** — all data is mocked, there is no backend. The purpose is to explore innovative and visually distinct interface designs for market research, so **each time this prompt is used, produce a completely different visual style, layout, colour scheme, typography, and interaction pattern.** Be creative and experimental — try unconventional layouts, bold aesthetics, and novel interaction ideas. The goal is to generate a range of diverse prototypes that can be shown to potential users to gauge preferences.

Output a single self-contained HTML file with inline CSS and JavaScript. It must work on mobile (optimised for small screens) and desktop.

---

## App Overview

An app that helps NSW learner drivers track their 120 required supervised driving hours (including 20 night hours) needed to obtain a P1 licence. The app logs trips, tracks progress, lets parents/supervisors approve trips, and includes an AI chatbot for road rules questions.

---

## Required Features

### Authentication
- A login screen and a registration screen (or combined)
- Registration collects: first name, last name, email, password, account type (Learner Driver or Parent/Supervisor), and Australian state
- Password must be minimum 8 characters
- Validate all fields and show error messages for invalid input
- Include a demo/quick-login button for fast access
- A mock user database with at least one pre-existing learner account and one parent account
- Session persistence within the tab so refreshing stays logged in
- Sign out functionality that returns to the login screen

### Trip Logger
- The primary screen of the app — this is what users see most
- A start/stop trip recording control that is **immediately accessible on mobile without scrolling** — this is the most critical interaction
- Before starting a trip, the user must select a **vehicle** and a **supervising driver**
- The user can tag **driving conditions** before or during a trip (rain, night, city, highway, school zone, rural)
- While a trip is recording, display live mock data: current speed, distance travelled, elapsed time, harsh braking count
- Show mock phone GPS coordinates and accuracy during recording
- Display overall progress toward the 120 hour requirement, broken down into day hours and night hours (20h night minimum)

### Trip History
- A scrollable list of past mock trips
- Each trip shows: date, time, duration, distance, supervising driver, vehicle, conditions, and approval status (approved or pending)
- Tapping a trip shows more detail
- Ability to filter trips (by status, by night driving, etc.)
- Visual charts (pie/donut) summarising trip data broken down by:
  - Day vs night hours
  - Driving conditions
  - Supervising driver
  - Vehicle
  - Approval status

### Road Rules AI Chatbot
- A chat interface where users can ask questions about NSW learner driving laws
- Pre-populated suggested questions the user can tap
- Mock AI responses for at least these topics: hours required for P1, night driving rules, speed limits for learners, logbook requirements
- A default response for any other question
- Show a typing/thinking indicator before responses appear
- Support basic text formatting in responses (bold text)

### Settings
- Display the logged-in user's profile (avatar/initials, name, account type, state)
- A working light/dark theme toggle that persists
- Menu items for: Profile, Supervisors, Parent Access, Phone GPS, Location Accuracy, Logger Defaults, Export Logbook
- All of these menu items show a message: "This feature has not been implemented as it is a demo"
- Sign out button

### General Requirements
- Mobile-first responsive design that also works on desktop
- Toast/snackbar notifications for user feedback on actions
- Navigation between all sections of the app
- All data is mocked with realistic Australian learner driver data
- Light and dark mode support

---

## Mock Data to Include

### Users
- A learner driver account (any name, email: demo@lplate.app, password: password123, state: NSW)
- A parent/supervisor account (any name, email: parent@lplate.app, password: password123, state: NSW)

### Trips (at least 7)
Include a mix of:
- Day and night trips
- Different supervisors (at least 2)
- Different vehicles (at least 2)
- Approved and pending statuses
- Various conditions (highway, city, rain, night, rural, school zone)
- Durations ranging from 30 minutes to 2+ hours
- Realistic distances for the duration

### Progress
- Total hours logged should be roughly 50-70 hours out of 120
- Night hours should be roughly 10-15 out of 20 required
- Show this as a percentage and breakdown

### AI Chatbot Responses
Provide accurate mock responses based on NSW road rules:
- 120 hours total required, 20 must be at night
- Must hold learner licence for 12 months minimum
- Maximum speed of 90 km/h regardless of posted limit
- Must display L-plates front and rear
- Zero blood alcohol concentration
- Must be accompanied by a fully licensed driver at all times
- Supervising driver must have held unrestricted licence for 1+ year
- Log book must record: date, start/end times, duration, odometer readings, day/night, supervisor name and signature, road conditions

---

## Important Notes
- This is a UI prototype for market research — prioritise visual design and interaction quality
- **Try a completely different aesthetic direction each time** — different colours, fonts, layouts, navigation patterns, animation styles
- Explore innovative approaches: gesture-based interactions, card-based layouts, dashboard styles, map-centric views, gamification elements, minimalist designs, skeuomorphic designs, etc.
- The start trip button must always be reachable without scrolling on a small mobile screen
- Do not use the name "Fred" anywhere in the app
- All settings features (except theme toggle and sign out) should show the demo not-implemented message
