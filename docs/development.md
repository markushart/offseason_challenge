# Development Workflow

## Current Project Shape

- App framework: Next.js with React and TypeScript in `offseason_challenge/`.
- Rendering/deploy target: static Next export generated into `offseason_challenge/out`.
- Hosting: Firebase Hosting serves `offseason_challenge/out`.
- Auth: Firebase Authentication with Google and email/password sign-in.
- Data: Cloud Firestore Standard / native mode, `(default)` database, location `nam5`.
- Current signed-in product surface: mobile-first challenge dashboard with separate Challenge and Admin panes.
- Current challenge member capabilities:
  - join through a reusable invite link
  - choose a challenge display name while joining
  - see team standings
  - expand a team to see participant scores
  - add completed fixed-point activities with a completion date
  - see recent activity
- Current admin capabilities:
  - create a challenge
  - become the initial admin of that challenge
  - add teams
  - generate one reusable invite link
  - create fixed-point activity rules
  - enable, disable, or remove activity rules
  - assign members to teams
  - promote participants to admins
  - remove participants
  - archive challenges
  - edit challenge name, description, and dates from the Admin pane only

## Local Commands

Run commands from the repository root unless noted.

```sh
npm run dev --prefix offseason_challenge
npm run lint --prefix offseason_challenge
npm run test --prefix offseason_challenge
npm run build --prefix offseason_challenge
npm run ci --prefix offseason_challenge
```

`npm run ci` runs lint, tests, and production build. This is the default check before deployment.

## Testing Requirement

Every new feature or behavior change must include at least lightweight test coverage before it is deployed.

The minimum acceptable test depends on the change:

- UI workflow changes: add or update a Vitest / Testing Library test for the user flow.
- Form changes: test validation, submit payload, and reset/error behavior.
- Firebase service changes: test data mapping and called write/read helpers with mocked Firebase boundaries.
- Scoring changes: add deterministic unit tests for point calculation.
- Security rule changes: run Firebase rules dry-run validation and add emulator-based permission tests once the emulator suite is available.

Do not deploy a frontend change unless this passes:

```sh
npm run ci --prefix offseason_challenge
```

Firebase Hosting is configured with a `predeploy` hook that runs the same check before manual Hosting deploys. GitHub Hosting workflows also run `npm run ci --prefix offseason_challenge` before deploy or preview deploy.

For normal feature work in this repository, commit and push verified changes to `develop`. The `develop` push starts the preview build workflow. Merging to `main` starts the live Firebase Hosting deploy workflow.

## Current Test Coverage

- `offseason_challenge/components/challenge-admin.test.tsx`
  - Covers team creation, challenge archive, member standings, participant promotion/removal, activity rule removal, and member activity submission.
- `offseason_challenge/lib/challenges.join.test.ts`
  - Covers reusable invite creation, challenge archive, participant promotion/removal, invite joins, activity rule deletion, and activity log writes.

## Deployment Notes

Firestore rules and indexes are deployed by `.github/workflows/firebase-firestore-rules.yml` on pushes to `develop` or `main` when `firestore.rules`, `firestore.indexes.json`, or `firebase.json` changes.

Validate Firestore rule changes before committing:

```sh
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run
```

Deploy Hosting after CI passes:

```sh
npx -y firebase-tools@latest deploy --only hosting
```

Current Firestore rules are prototype rules. They are intentionally strict for the first admin workflow, but they should be reviewed and hardened before broad sharing.
