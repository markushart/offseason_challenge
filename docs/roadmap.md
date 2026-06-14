# Implementation Roadmap

## Phase 0: Project Setup

- Create React app structure.
- Add TypeScript.
- Add Firebase SDK.
- Add environment configuration for Firebase project values.
- Add routing and basic app shell.
- Add linting, formatting, and test runner.

## Phase 1: Authentication and Profiles

- Implement sign up, sign in, sign out.
- Create user profile document after registration.
- Add protected routes.
- Show current user state in the app shell.

## Phase 2: Competition Management

- Create competition form.
- Store creator as competition admin.
- Add competition list for the signed-in user.
- Add competition detail page.
- Add team creation and editing.
- Add member list.
- Add admin-only controls.

## Phase 3: Invites and Team Assignment

- Generate invite codes or links.
- Let participants join a competition through an invite, preferably through a callable Cloud Function.
- Let admins assign participants to teams.
- Prevent duplicate active membership for the same competition.

## Phase 4: Activity Catalog

- Seed the activity rules from `rules.pdf`.
- Store rules in Firestore under each competition.
- Load enabled activity rules into the activity submission UI.
- Build reusable scoring functions for fixed, choice, thresholds, manual range, and bonus rules.

## Phase 5: Activity Submission

- Build participant activity entry form.
- Calculate points before submission.
- Store activity logs with activity rule snapshots.
- Add optional proof upload to Firebase Storage.
- Add pending / accepted / rejected status support.

## Phase 6: Standings and Dashboards

- Show participant points.
- Show team standings.
- Show recent activity feed.
- Add filters by week, team, participant, and activity category.
- Add weekly cap handling for extra / replacement points.

## Phase 7: Admin Review

- Add moderation queue if approval mode is enabled.
- Let admins approve, reject, or adjust submissions.
- Show audit information for reviewed logs.

## Phase 8: Hardening

- Write Firestore Security Rules.
- Add tests for scoring.
- Add tests for permission-sensitive flows.
- Add indexes for standings and activity feed queries.
- Decide whether score aggregation needs Cloud Functions.

## Initial Technical Choices

- React with TypeScript for the frontend.
- Firebase Authentication for accounts.
- Cloud Firestore for app data.
- Firebase Storage for uploaded proof.
- Optional Firebase Cloud Functions for trusted scoring and score aggregation.

## Key Early Decision

Activities can and should be database-backed. The React app should render activity options from Firestore and use a shared scoring module to interpret each rule. This keeps the rules from `rules.pdf` editable without code changes and avoids scattering point values across UI components.
