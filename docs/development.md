# Development Workflow

## Current Project Shape

- App framework: Next.js with React and TypeScript in `offseason_challenge/`.
- Rendering/deploy target: static Next export generated into `offseason_challenge/out`.
- Hosting: Firebase Hosting serves `offseason_challenge/out`.
- Auth: Firebase Authentication with Google and email/password sign-in.
- Data: Cloud Firestore Standard / native mode, `(default)` database, location `nam5`.
- Current signed-in product surface: mobile-first challenge admin workflow.
- Current admin capabilities:
  - create a challenge
  - become the initial admin of that challenge
  - add teams
  - generate invite codes
  - create fixed-point activity rules
  - enable or disable activity rules

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

## Current Test Coverage

- `offseason_challenge/components/challenge-admin.test.tsx`
  - Covers the team creation form.
  - Verifies the team write payload.
  - Verifies the async submit handler resets the form without the previous `currentTarget` null regression.

## Deployment Notes

Deploy Firestore rules and indexes after review:

```sh
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

Deploy Hosting after CI passes:

```sh
npx -y firebase-tools@latest deploy --only hosting
```

Current Firestore rules are prototype rules. They are intentionally strict for the first admin workflow, but they should be reviewed and hardened before broad sharing.
