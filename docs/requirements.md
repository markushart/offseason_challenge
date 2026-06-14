# Offseason Challenge Requirements

## Product Goal

Build a React web application backed by Google Firebase where participants can join sports competitions, be assigned to teams, log completed activities, and earn points based on the rules in `rules.pdf`.

The first target sport is handball offseason / preseason preparation, but the system should keep the scoring catalog configurable so the same app can support later rule changes or other sports.

## User Roles

### Participant

- Create an account and sign in.
- Join a competition through an invitation or enrollment flow.
- Belong to one team inside a competition.
- Log completed activities.
- Attach optional proof, such as screenshots, fitness app exports, or photos.
- See personal points, team points, recent activity, and competition standings.

### Competition Admin

- Create a new competition.
- Automatically become admin of the competition they create.
- Invite people to the competition.
- Assign invited participants to teams.
- Create, edit, or archive teams in their competition.
- Review activity submissions if proof or moderation is required.
- Configure which activity rules are active for the competition.

### Platform Admin

This role is not required for the first version, but may be useful later for global templates, abuse handling, and support.

## Core Workflows

### Account Creation

- User registers with Firebase Authentication.
- User profile is created in Firestore.
- User can later join one or more competitions.

### Competition Creation

- Signed-in user creates a competition.
- The creator is stored as competition admin.
- Competition starts with no teams or with optional initial teams.
- Admin can choose an activity rule set template, such as the rules from `rules.pdf`.

### Invitation and Enrollment

- Admin creates invite links or invite codes for a competition.
- Participant uses the invite to enroll.
- Participant starts as unassigned until the admin places them on a team, unless self-selection is enabled.
- A participant should only belong to one team per competition.

### Team Competition

- A competition has two or more teams.
- Teams compete by accumulating points from participant activity logs.
- Standings are calculated from accepted activity logs and bonuses.

### Activity Logging

- Participant chooses an activity type from the configured database catalog.
- Participant enters required values, such as date, duration, intensity, or notes.
- App calculates suggested points from the activity rule.
- Activity is submitted as accepted automatically or as pending review, depending on competition settings.
- Admin can approve, reject, or adjust entries if moderation is enabled.

## Scoring Rules From `rules.pdf`

### Official Team Appointments

| Activity | Points |
| --- | ---: |
| Normal team training | 10 |
| Match / test match | 10 |
| Training camp unit | 10 |
| Thursday complete including athletic training | 10 |
| Thursday without athletic training | 8 |

Weekly bonus:

| Rule | Bonus Points |
| --- | ---: |
| Attended all trainings plus match / test match | +2 |

### Running / Jogging

| Duration | Points |
| --- | ---: |
| 20 minutes | 2 |
| 30 minutes | 3 |
| 40 minutes | 4 |
| 50 minutes | 5 |
| 60 minutes | 6 |
| Each additional 15 minutes after 60 minutes | +1 |
| Maximum reachable | 8 |

### Cycling

| Duration | Points |
| --- | ---: |
| 30 minutes | 1 |
| 45 minutes | 2 |
| 60 minutes | 3 |
| 90 minutes | 4 |
| 120 minutes | 5 |
| Maximum reachable | 5 |

### Gym / Athletic Training

| Activity | Points |
| --- | ---: |
| Short unit | 2 |
| Complete unit | 4 |
| Intensive athletic / strength unit | 5 |
| Maximum reachable | 5 |

### Recovery / Light Activity

| Activity | Points |
| --- | ---: |
| Walk 30-60 minutes | 1 |
| Mobility / yoga / stretching | 1 |
| Recovery unit | 1 |
| Maximum per day | 2 |

### Other Sports Activities

| Activity | Points |
| --- | ---: |
| Light activity | 1-2 |
| Intensive activity | 3-4 |
| Maximum reachable | 4 |

### General Rules

- Team training remains the most important point source.
- Replacement points count in addition to team training or for excused absences.
- Team training cannot be permanently replaced by solo sport.
- Additional / replacement points are capped at 15 per week.
- Proof can be provided through screenshots, fitness apps, or photos.
- The system should motivate and strengthen team culture, not punish participants.
- Missing Thursday athletic training reduces the Thursday unit from 10 to 8 points.
- Missing athletic points can be partially compensated through independent sports activity.

## Data-Driven Activity Catalog Requirement

Activities should not be hard coded in React components.

Store activity definitions and scoring rules in Firestore, then load them into the UI and scoring service. This allows admins or future maintainers to change durations, point values, caps, labels, and active activities without redeploying the frontend.

The frontend may still contain TypeScript types and default seed data, but runtime activity options should come from the database.

## Non-Functional Requirements

- Firebase Authentication for user identity.
- Firestore for competitions, teams, users, activity definitions, and submissions.
- Firebase Storage for optional proof uploads.
- Firestore Security Rules must enforce competition membership and admin permissions.
- Scoring should be deterministic and testable.
- Competition data should be separated so users can participate in multiple competitions later.
- The application should work well on mobile because participants will likely log activities from phones.

## Open Questions

- Should activity submissions require admin approval, or be accepted immediately?
- Should proof be mandatory for all activities, only high-value activities, or optional?
- Can participants choose their own team, or should only admins assign teams?
- Can a participant be in multiple competitions at the same time?
- Should official team appointments be logged by participants, by admins, or imported from a schedule?
- Should competitions always be exactly two teams, or support more than two teams?
- How should weekly periods be defined: calendar week, competition-specific week start, or rolling seven days?
