# Project Progress

## Current State

- Repository exists.
- `README.md` links to the initial project documentation.
- `rules.pdf` exists and has been reviewed.
- A Next.js React application exists under `offseason_challenge/`.
- Firebase Hosting is configured to serve the static Next export from `offseason_challenge/out`.
- The first signed-in page is a challenge admin workflow for creating challenges, teams, invites, and fixed-point activity rules.
- Signed-in users can switch between joined challenges from a dashboard sidebar/mobile selector.
- Invite links with `?join=CODE` are supported and can auto-join a signed-in user to a challenge.
- Frontend design should be mobile-first because the app will mostly be used on phones.
- Lightweight automated testing is required for new development before deployment.
- Requirements and architecture docs have been added under `docs/`.
- Firebase configuration has been added for local development and deployment.

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
- Added Firebase Web SDK and a Google plus email/password sign-up/sign-in shell.
- Added `offseason_challenge/.env.example` for Firebase web app configuration.
- Added Firestore client support for challenge management data.
- Added prototype Firestore rules and indexes configuration.
- Added challenge creation, team creation, invite generation, and fixed-point activity rule management in the web app.
- Added challenge detail editing (name, description, dates) from the admin UI.
- Added participant membership join flow using one reusable invite link per challenge.
- Added admin team assignment for challenge members.
- Added participant-chosen display names during invite join.
- Added admin participant removal and hid participant email addresses from the member list.
- Captured mobile-first UX as a primary frontend requirement.
- Added Vitest and Testing Library coverage for the challenge admin team creation flow.
- Updated Firebase Hosting workflows to run lint, tests, and build before deploy.
- Added Firebase Hosting `predeploy` hook to run the same CI gate for manual Hosting deploys.
- Deployed prototype Firestore rules and indexes for the first challenge-admin workflow.
- Added `docs/development.md` with current commands, testing rules, and deployment notes.

## In Progress

- Challenge admin workflow iteration.
- Mobile-first interface refinement.
- Test coverage expansion.

## Not Started

- Firestore profile creation after first sign-in.
- Production-reviewed Firestore Security Rules.
- Activity rule seed data.
- Team editing and removal workflows.
- Activity submission UI.
- Standings.
- Broader tests for invite, activity, auth, and Firestore permission-sensitive flows.

## Notes

- The current scoring rules are based on the PDF created on 2026-05-19.
- Firestore exists as the `(default)` database in Standard / native mode in location `nam5`.
- Current Firestore rules are prototype rules and should be reviewed before broad app sharing.
- Current activity management supports fixed-point custom activities only. Threshold, choice, manual range, and bonus rule editing are still future work.
- Current invite join flow runs from the client using Firestore queries and writes; callable-function hardening is still future work.
- Firebase JSON config has been validated with `jq`.
- Firebase Emulator Suite validation has not run yet because `java` is not installed or not available on `PATH`.
