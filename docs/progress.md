# Project Progress

## Current State

- Repository exists.
- `README.md` links to the initial project documentation.
- `rules.pdf` exists and has been reviewed.
- No React application has been created yet.
- No Firebase project configuration exists in this repository yet.
- Requirements and architecture docs have been added under `docs/`.
- A draft Firebase configuration has been added for local development and future deployment.

## Completed

- Extracted the sports activity point system from `rules.pdf`.
- Captured product requirements in `docs/requirements.md`.
- Drafted a Firestore data model in `docs/firebase-data-model.md`.
- Created an implementation roadmap in `docs/roadmap.md`.
- Confirmed that activities can be stored in Firestore instead of hard coded.
- Added Firebase setup proposal, rules files, indexes, emulator config, and environment template.

## In Progress

- Requirements discovery.
- Initial architecture planning.

## Not Started

- React project setup.
- Firebase project setup.
- Firebase Authentication integration in React.
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
- `rules.pdf` is currently untracked according to `git status`.
- The backend does not exist yet, so Firebase collection names and rules are still draft decisions.
- Firebase JSON config has been validated with `jq`.
- Firebase Emulator Suite validation has not run yet because `java` is not installed or not available on `PATH`.
