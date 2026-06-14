# Project Progress

## Current State

- Repository exists.
- `README.md` links to the initial project documentation.
- `rules.pdf` exists and has been reviewed.
- A Next.js React application exists under `offseason_challenge/`.
- Firebase Hosting is configured to serve the static Next export from `offseason_challenge/out`.
- The first demo page is gated behind Firebase Auth and shows a Google sign-up screen before the static dashboard mock.
- Requirements and architecture docs have been added under `docs/`.
- A draft Firebase configuration has been added for local development and future deployment.

## Completed

- Extracted the sports activity point system from `rules.pdf`.
- Captured product requirements in `docs/requirements.md`.
- Drafted a Firestore data model in `docs/firebase-data-model.md`.
- Created an implementation roadmap in `docs/roadmap.md`.
- Confirmed that activities can be stored in Firestore instead of hard coded.
- Added Firebase setup proposal, rules files, indexes, emulator config, and environment template.
- Created the initial Next.js app folder.
- Replaced the starter page with a first demo for the Offseason Challenge concept.
- Pointed Firebase Hosting and GitHub Hosting workflows at the nested Next app build output.
- Added Firebase Web SDK and a Google sign-up/sign-in shell.
- Added `offseason_challenge/.env.example` for Firebase web app configuration.

## In Progress

- Requirements discovery.
- Initial architecture planning.
- Static demo iteration.

## Not Started

- Firebase project setup.
- Firestore profile creation after first sign-in.
- Production-reviewed Firestore Security Rules.
- Activity rule seed data.
- Competition creation UI.
- Invite flow.
- Team management.
- Activity submission UI.
- Standings.
- Tests.

## Notes

- The current scoring rules are based on the PDF created on 2026-05-19.
- The backend does not exist yet, so Firebase collection names and rules are still draft decisions.
- Firebase JSON config has been validated with `jq`.
- Firebase Emulator Suite validation has not run yet because `java` is not installed or not available on `PATH`.
