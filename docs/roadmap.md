# Implementation Roadmap

## Phase 0: Project Setup

- Create Next.js React app structure. Done.
- Add TypeScript. Done.
- Add Firebase SDK. Done.
- Add environment configuration for Firebase project values. Done.
- Add basic app shell. Done.
- Add linting and test runner. Done.
- Keep `npm run ci --prefix offseason_challenge` as the required pre-deploy gate.

## Phase 1: Authentication and Profiles

- Implement sign up, sign in, sign out. Google sign-in is done.
- Create user profile document after registration.
- Add protected routes / protected signed-in app shell. Initial Auth shell is done.
- Show current user state in the app shell. Done.

## Phase 2: Competition Management

- Create competition form. Initial version done.
- Store creator as competition admin. Done.
- Add competition list for the signed-in user. Initial member challenge list and switching UI done.
- Add competition detail page. Initial same-page Challenge/Admin pane split is done.
- Add team creation and editing. Team creation, member assignment, and participant removal are done; team editing/removal not started.
- Add member list. Done.
- Add admin-only controls. Initial Firestore rules and UI controls done for challenge admins.

## Phase 3: Invites and Team Assignment

- Generate one reusable invite link per competition. Initial invite link generation done.
- Let participants join a competition through an invite. Initial client-side join flow with participant-chosen display names is done; callable Cloud Function version is pending.
- Let admins assign participants to teams. Initial assignment flow done.
- Prevent duplicate active membership for the same competition.

## Phase 4: Activity Catalog

- Seed the activity rules from `rules.pdf`.
- Store rules in Firestore under each competition. Initial fixed-point custom activity rule creation, enable/disable, and admin removal are done.
- Load enabled activity rules into the activity submission UI. Done for fixed-point completion rules.
- Build reusable scoring functions for fixed, choice, thresholds, manual range, and bonus rules.

## Phase 5: Activity Submission

- Build participant activity entry form. Initial fixed-point completion form is done.
- Calculate points before submission. Done for fixed-point rules.
- Store activity logs with activity rule snapshots. Done for fixed-point rules.
- Add optional proof upload to Firebase Storage.
- Add pending / accepted / rejected status support.

## Phase 6: Standings and Dashboards

- Show participant points.
- Show team standings. Initial version is done and sums accepted logs by each active member's current team assignment.
- Show recent activity feed. Initial version is done.
- Add filters by week, team, participant, and activity category.
- Add weekly cap handling for extra / replacement points.

## Phase 7: Admin Review

- Add moderation queue if approval mode is enabled.
- Let admins approve, reject, or adjust submissions.
- Show audit information for reviewed logs.

## Phase 8: Hardening

- Write Firestore Security Rules. Prototype admin-workflow rules are done and deployed.
- Add tests for scoring.
- Add tests for permission-sensitive flows.
- Add indexes for standings and activity feed queries.
- Decide whether score aggregation needs Cloud Functions.

## Development Gate

Before any deploy, run:

```sh
npm run ci --prefix offseason_challenge
```

New development must include lightweight tests appropriate to the change before deployment. The current deploy workflows and Firebase Hosting `predeploy` hook run CI automatically.

## Initial Technical Choices

- Next.js with React and TypeScript for the frontend.
- Firebase Authentication for accounts.
- Cloud Firestore for app data.
- Firebase Storage for uploaded proof.
- Optional Firebase Cloud Functions for trusted scoring and score aggregation.

## Key Early Decision

Activities can and should be database-backed. The React app should render activity options from Firestore and use a shared scoring module to interpret each rule. This keeps the rules from `rules.pdf` editable without code changes and avoids scattering point values across UI components.
