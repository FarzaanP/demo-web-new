# NewRamCentral - Web App Starter

A working front-end + back-end scaffold for the NewRamCentral club-management app, built to match
the ERD, use cases, and object model from your Sprint 5-7 documents. This is a **foundation**, not
a finished product — it covers the core flows (auth, browse/join clubs, officer management,
announcements, events) so your team can build the rest of your requirements on top of it.

## Stack

- **Frontend:** React 18 + Vite + React Router
- **Backend:** Firebase (Firestore for data, Firebase Authentication for login)
- No separate Node/Express server is needed — Firestore's security rules (`firestore.rules`) are
  your backend's authorization layer, and the Firebase SDK talks to Firestore directly from the
  browser.

## What's built

| Feature | Where |
|---|---|
| Sign up / log in | `src/pages/Signup.jsx`, `src/pages/Login.jsx` |
| Browse clubs + "my clubs" | `src/pages/Home.jsx` |
| Club detail: info, join/leave, announcements, events, member list | `src/pages/ClubDetail.jsx` |
| Start a new club | `src/pages/CreateClub.jsx` |
| Officer tools: edit club info, post announcements, create events, approve join requests, promote members to officer | inside `src/pages/ClubDetail.jsx` |
| All-clubs events feed | `src/pages/Events.jsx` |
| Profile / bio | `src/pages/Profile.jsx` |
| Data access layer | `src/services/clubs.js`, `src/services/events.js` |
| Security rules | `firestore.rules` |

## What's intentionally NOT built yet (per the doc review)

- **Real-time chat / WhatsApp integration** - your acceptance criteria mention this, but it's a
  large scope addition (see feedback above). The `chatEnabled` flag already exists on the club
  document so you can build this feature later without a schema change.
- **MyFSC SSO** - this uses Firebase's own email/password auth as a placeholder. Swapping in real
  SSO later means adding a SAML/OIDC provider in the Firebase Auth console; the rest of the app
  doesn't need to change since it only depends on `auth.currentUser`.
- **Push notifications** - would use Firebase Cloud Messaging (FCM); not wired up here.
- **Club approval by Office of Student Affairs** - right now any signed-in user can create a club
  instantly. Add an `approvalStatus` field on the club doc and a rule restricting `status: active`
  writes to an `admin` role if you want to build this out.

## Setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. In **Build > Authentication**, click "Get started" and enable the **Email/Password** sign-in method.
3. In **Build > Firestore Database**, click "Create database" and start in **production mode**
   (the rules in this repo will handle security, not the default "test mode" rules).
4. In **Project settings > General**, scroll to "Your apps", click the web icon (`</>`), register
   an app (nickname doesn't matter), and copy the `firebaseConfig` values it shows you.

### 2. Configure this project

```bash
cp .env.example .env
```

Paste the values from step 1.4 into `.env`. Every value is required.

### 3. Install and run

```bash
npm install
npm run dev
```

Visit the local URL it prints (usually `http://localhost:5173`). Create an account through the
signup page - that also creates your `users/{uid}` document in Firestore.

### 4. Deploy your security rules and indexes

The app will not work correctly against a freshly created Firestore database until the rules and
indexes in this repo are deployed (a bare "production mode" database rejects all reads/writes by
default).

```bash
npm install -g firebase-tools    # one-time
firebase login
firebase use --add               # pick your project, give it an alias like "default"
firebase deploy --only firestore:rules,firestore:indexes
```

If you use a feature that needs an index this repo didn't anticipate, Firestore will throw an
error in your browser console containing a direct link to create that exact index - click it,
approve it in the console, and retry.

### 5. Deploy the web app itself (optional, once you're ready to share a live link)

```bash
npm run build
firebase deploy --only hosting
```

## Data model

Collections map onto your ERD like this:

- `users/{uid}` - one doc per person (student or faculty), keyed by Firebase Auth uid. Holds
  `ramId`, `name`, `email`, `role`, `bio`.
- `clubs/{clubId}` - one doc per club: `name`, `description`, `category`, `meetingTimes`,
  `contactInfo`, `requiresApproval`, `status`, `memberCount`.
  - `clubs/{clubId}/members/{uid}` - the join table between users and clubs (your ERD's implicit
    "is a member of" / "manages" relationships). Holds `role` (`member` / `officer` / `president`)
    and `status` (`pending` / `approved`). **This is where "officer-ness" lives** - a user can be
    `member` in one club and `president` in another, matching your Officer entity's composite
    `RAMID + ClubID` key.
  - `clubs/{clubId}/announcements/{id}` - officer-authored posts.
- `events/{eventId}` - `clubId`, `title`, `description`, `location`, `dateTime`, `attendeeCount`.
  - `events/{eventId}/attendees/{uid}` - RSVPs.

## Known simplifications worth mentioning in your next report

- `memberCount` is stored directly on the club doc and incremented/decremented in application code
  (see `services/clubs.js`) rather than computed live, matching your existing data dictionary - but
  it's technically a derived value, so note that as a deliberate simplification.
- Member display names are resolved with one Firestore read per member when a club page loads.
  This is fine at club-sized scale (tens to low hundreds of members) but wouldn't scale to a
  campus-wide roster without denormalizing the name onto the membership doc.
