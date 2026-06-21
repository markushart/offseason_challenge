# Firebase Backend Setup Proposal

This project should use Firebase as a managed backend for authentication, app data, proof uploads, local emulation, and eventually trusted scoring.

## Firebase Products

Use these Firebase products first:

- Firebase Authentication for participant accounts.
- Cloud Firestore for competitions, teams, members, activity rules, invites, and activity logs.
- Cloud Storage for uploaded proof files.
- Firebase Emulator Suite for local development.
- Firebase Hosting for the static Next.js export.
- Cloud Functions later, if final score calculation or score aggregation must be trusted server-side.

## Project Files

The proposed Firebase config is:

```text
offseason_challenge/.env.example
.firebaserc.example
firebase.json
firestore.rules
firestore.indexes.json
storage.rules
```

Do not commit a real `.firebaserc` until the project ID is decided. Copy `.firebaserc.example` to `.firebaserc` locally and replace `your-firebase-project-id`.

Do not commit `.env.local`. Copy `offseason_challenge/.env.example` to `offseason_challenge/.env.local` and fill it with the web app config from the Firebase Console.

## Environment Variables

For the current Next.js app, use `NEXT_PUBLIC_` prefixed variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

Firebase web config values are not treated like server secrets. They identify the Firebase project used by the client app. Security comes from Firebase Authentication, Firestore Security Rules, Storage Security Rules, and later App Check if needed.

## Suggested Frontend Firebase Module

The app now includes a Firebase client module at `offseason_challenge/lib/firebase.ts`.
It initializes Firebase Auth and Firestore from the public Next environment variables
and can connect to the Auth and Firestore emulators when
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.

The current Auth-focused version follows this shape:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

## First Console Setup

1. Create a Firebase project.
2. Register a web app and copy the web config into `offseason_challenge/.env.local`.
3. Enable Authentication with Google first.
4. Create the default Firestore database.
5. Create the default Storage bucket.
6. Copy `.firebaserc.example` to `.firebaserc` and set the real project ID.
7. Deploy rules after review.

## Local Development Commands

Install the Firebase CLI if needed, then:

```sh
npx -y firebase-tools@latest login
npx -y firebase-tools@latest emulators:start
npm run ci --prefix offseason_challenge
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage
```

Use `firebase init` carefully: keep the existing `firebase.json`, `firestore.rules`, and `storage.rules` unless you intentionally want to regenerate them.

## Security Rule Direction

The initial rules are strict by default:

- Users can manage only their own profile document.
- Competition members can read competition data.
- Competition admins can manage teams, members, invites, and activity rules.
- Participants can create activity logs for themselves.
- Proof uploads are scoped to `competitions/{competitionId}/proofs/{userId}/{fileName}`.
- Deletes are disabled for most core Firestore data in the first draft; admins can delete activity rule documents.
- Participants cannot add themselves to arbitrary competitions without a valid invite code.

The current checked-in `firestore.rules` file covers the current challenge/admin prototype:

- A signed-in user can create a competition and becomes its sole initial admin.
- Competition admins can create teams, one reusable invite link, and fixed-point activity rules.
- Competition members can read teams, enabled/disabled activity rules, and accepted activity logs for standings.
- Direct self-enrollment is allowed only through the invite join flow, which validates the invite code and writes an active participant membership.

Run this before deploying rule changes:

```sh
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run
```

The current activity log rule allows clients to submit `calculatedPoints`, requires `finalPoints` to match, and validates the selected enabled fixed-point activity rule, activity name snapshot, point value, current user ID, and current member team. This is acceptable for an early fixed-point prototype, but the production version should move scoring into Cloud Functions or extend rule validation for every future scoring type.

## Invite Acceptance

The current invite acceptance flow is client-side:

- A participant submits an invite code from the link.
- The client queries the invite by code, creates or reactivates the participant member document, and appends the user ID to `memberIds`.
- The member joins unassigned; admins assign teams later.

For stronger production hardening, move invite acceptance to a callable Cloud Function so invite lookup and membership writes happen server-side.

## Recommended Collection Paths

```text
users/{userId}
activityRuleTemplates/{templateId}
competitions/{competitionId}
competitions/{competitionId}/teams/{teamId}
competitions/{competitionId}/members/{userId}
competitions/{competitionId}/invites/{inviteId}
competitions/{competitionId}/activityRules/{activityRuleId}
competitions/{competitionId}/activityLogs/{activityLogId}
```

These paths match `docs/firebase-data-model.md`.

## Open Decisions

- Whether activity logs should be auto-accepted or admin-reviewed by default.
- Whether proof uploads are mandatory.
- Whether reusable invite links need revocation, rotation, or expiration before a real competition.
- Whether final score calculation should move to Cloud Functions before the first real competition.
