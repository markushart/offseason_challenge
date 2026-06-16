# Firebase Data Model Draft

This is a first Firestore-oriented model for the Offseason Challenge app. It is intentionally data-driven so activity scoring can be stored in the database instead of being hard coded in the React page.

## Collections

```text
users/{userId}
competitions/{competitionId}
competitions/{competitionId}/teams/{teamId}
competitions/{competitionId}/members/{userId}
competitions/{competitionId}/invites/{inviteId}
competitions/{competitionId}/activityRules/{activityRuleId}
competitions/{competitionId}/activityLogs/{activityLogId}
activityRuleTemplates/{templateId}
```

## `users/{userId}`

```json
{
  "displayName": "Jane Example",
  "email": "jane@example.com",
  "photoURL": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Stores platform-level profile data. Competition-specific roles and team memberships belong under each competition, not here.

## `competitions/{competitionId}`

```json
{
  "name": "Handball Offseason Challenge 2026",
  "description": "Preseason points competition",
  "createdBy": "userId",
  "adminIds": ["userId"],
  "memberIds": ["userId"],
  "status": "draft",
  "startsAt": "timestamp",
  "endsAt": "timestamp",
  "settings": {
    "activityApprovalMode": "auto",
    "proofRequired": false,
    "weekStartsOn": 1,
    "allowMoreThanTwoTeams": true
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Suggested statuses:

- `draft`
- `active`
- `completed`
- `archived`

## `competitions/{competitionId}/teams/{teamId}`

```json
{
  "name": "Team Blue",
  "color": "#2563eb",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Team score can be calculated from accepted logs. A cached score may be added later if standings queries become expensive.

## `competitions/{competitionId}/members/{userId}`

```json
{
  "userId": "userId",
  "displayNameSnapshot": "Participant Name",
  "emailSnapshot": "participant@example.com",
  "teamId": "teamId",
  "role": "participant",
  "status": "active",
  "joinedAt": "serverTimestamp",
  "invitedBy": "adminUserId"
}
```

Suggested roles:

- `admin`
- `participant`

Suggested statuses:

- `invited`
- `active`
- `removed`

Participants choose `displayNameSnapshot` when accepting an invite. Admin member lists should show participant display names, not email addresses. Removing a participant marks the member `removed` and removes the user ID from the competition `memberIds` array so the challenge no longer appears in their list.

## `competitions/{competitionId}/invites/{inviteId}`

```json
{
  "code": "ABC123",
  "createdBy": "adminUserId",
  "createdAt": "serverTimestamp",
  "disabledAt": null
}
```

Each competition should expose one reusable invite link. New participants always join as unassigned; admins assign teams from the member list.

## `competitions/{competitionId}/activityRules/{activityRuleId}`

Activity rules should be copied from a template into each competition. This gives every competition a stable scoring snapshot even if global templates are changed later.

The current admin UI can create fixed-point custom activity rules first:

```json
{
  "name": "Normal team training",
  "category": "team_training",
  "enabled": true,
  "inputType": "completion",
  "scoring": {
    "type": "fixed",
    "points": 10
  },
  "limits": {
    "countsTowardWeeklyExtraCap": true
  },
  "requiresProof": false,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

The broader target model still supports richer rule types:

```json
{
  "name": "Running / Jogging",
  "category": "running",
  "enabled": true,
  "inputType": "duration",
  "unit": "minutes",
  "scoring": {
    "type": "thresholds",
    "thresholds": [
      { "min": 20, "points": 2 },
      { "min": 30, "points": 3 },
      { "min": 40, "points": 4 },
      { "min": 50, "points": 5 },
      { "min": 60, "points": 6 }
    ],
    "incrementAfter": {
      "after": 60,
      "step": 15,
      "pointsPerStep": 1
    },
    "maxPointsPerEntry": 8
  },
  "limits": {
    "maxPointsPerDay": null,
    "maxExtraPointsPerWeek": 15
  },
  "requiresProof": false,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Possible scoring types:

- `fixed`: one fixed point value.
- `choice`: user/admin selects one option, such as short / complete / intensive.
- `thresholds`: points are calculated from a numeric value such as duration.
- `manualRange`: user/admin selects or enters a value inside an allowed range.
- `bonus`: calculated from other logs or attendance rules.

## Example Activity Rule Documents

### Fixed Team Training

```json
{
  "name": "Normal team training",
  "category": "team_training",
  "enabled": true,
  "inputType": "attendance",
  "scoring": {
    "type": "fixed",
    "points": 10
  },
  "limits": {
    "countsTowardWeeklyExtraCap": false
  }
}
```

### Cycling

```json
{
  "name": "Cycling",
  "category": "cycling",
  "enabled": true,
  "inputType": "duration",
  "unit": "minutes",
  "scoring": {
    "type": "thresholds",
    "thresholds": [
      { "min": 30, "points": 1 },
      { "min": 45, "points": 2 },
      { "min": 60, "points": 3 },
      { "min": 90, "points": 4 },
      { "min": 120, "points": 5 }
    ],
    "maxPointsPerEntry": 5
  },
  "limits": {
    "countsTowardWeeklyExtraCap": true
  }
}
```

### Recovery

```json
{
  "name": "Recovery / light activity",
  "category": "recovery",
  "enabled": true,
  "inputType": "choice",
  "options": [
    { "label": "Walk 30-60 minutes", "points": 1 },
    { "label": "Mobility / yoga / stretching", "points": 1 },
    { "label": "Recovery unit", "points": 1 }
  ],
  "limits": {
    "maxPointsPerDay": 2,
    "countsTowardWeeklyExtraCap": true
  }
}
```

## `competitions/{competitionId}/activityLogs/{activityLogId}`

```json
{
  "userId": "userId",
  "teamId": "teamId",
  "activityRuleId": "running",
  "activityNameSnapshot": "Running / Jogging",
  "activityDate": "timestamp",
  "input": {
    "durationMinutes": 45,
    "choiceKey": null,
    "notes": "Easy run"
  },
  "calculatedPoints": 4,
  "finalPoints": 4,
  "status": "accepted",
  "proofFileIds": [],
  "review": {
    "reviewedBy": null,
    "reviewedAt": null,
    "reason": null
  },
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Suggested statuses:

- `pending`
- `accepted`
- `rejected`

Store snapshots such as `activityNameSnapshot` and `finalPoints` so historical logs remain understandable if activity rules are edited later.

## Security Rule Intent

- Users can read competitions where they are members.
- Users can create logs only for themselves inside competitions where they are active members.
- Users cannot write arbitrary `finalPoints`; points should be calculated by trusted code or validated carefully.
- Competition admins can manage teams, members, invites, settings, and activity rules.
- Participants can read enabled activity rules for competitions they belong to.
- Proof files in Firebase Storage should be scoped by competition and user.

## Scoring Implementation Recommendation

Keep scoring in a shared TypeScript module, not inside React components. The module should accept an `activityRule`, an `activityLog.input`, and current period totals, then return calculated points plus validation messages.

For stronger trust later, move final point calculation into a Firebase Cloud Function or validate point calculations in Firestore Security Rules where feasible.
