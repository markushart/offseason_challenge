import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Challenge = {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "completed" | "archived";
  adminIds: string[];
  createdBy: string;
};

export type Team = {
  id: string;
  name: string;
  color: string;
};

export type Invite = {
  id: string;
  code: string;
  teamId: string | null;
  usedCount: number;
  maxUses: number | null;
  disabledAt: unknown | null;
};

export type ActivityRule = {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  requiresProof: boolean;
  scoring: {
    type: "fixed";
    points: number;
  };
};

export type ChallengeDetail = {
  teams: Team[];
  invites: Invite[];
  activityRules: ActivityRule[];
};

export type CreateChallengeInput = {
  name: string;
  description: string;
};

export type CreateTeamInput = {
  competitionId: string;
  name: string;
  color: string;
};

export type CreateInviteInput = {
  competitionId: string;
  teamId: string | null;
  maxUses: number | null;
};

export type CreateActivityRuleInput = {
  competitionId: string;
  name: string;
  category: string;
  points: number;
  requiresProof: boolean;
};

const assertDb = () => {
  if (!db) {
    throw new Error("Firebase is not configured. Add values to .env.local.");
  }

  return db;
};

const fromChallengeSnapshot = (snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.map((challengeDoc) => {
    const data = challengeDoc.data();

    return {
      id: challengeDoc.id,
      name: String(data.name ?? ""),
      description: String(data.description ?? ""),
      status: data.status ?? "draft",
      adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
      createdBy: String(data.createdBy ?? ""),
    } satisfies Challenge;
  });

const createInviteCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export function listenAdminChallenges(
  userId: string,
  onData: (challenges: Challenge[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const firestore = assertDb();
  const challengesQuery = query(
    collection(firestore, "competitions"),
    where("adminIds", "array-contains", userId),
  );

  return onSnapshot(
    challengesQuery,
    (snapshot) => {
      const challenges = fromChallengeSnapshot(snapshot).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      onData(challenges);
    },
    onError,
  );
}

export function listenChallenge(
  challengeId: string,
  onData: (challenge: Challenge) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    doc(firestore, "competitions", challengeId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onData({
          id: snapshot.id,
          name: String(data.name ?? ""),
          description: String(data.description ?? ""),
          status: data.status ?? "draft",
          adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
          createdBy: String(data.createdBy ?? ""),
        });
      }
    },
    onError,
  );
}

export function listenMemberChallenges(
  userId: string,
  onData: (challenges: Challenge[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const firestore = assertDb();
  const membershipsQuery = query(
    collectionGroup(firestore, "members"),
    where("userId", "==", userId),
    where("status", "==", "active"),
  );

  return onSnapshot(
    membershipsQuery,
    (snapshot) => {
      const competitionIds = snapshot.docs.map((mDoc) => mDoc.ref.parent.parent!.id);

      if (competitionIds.length === 0) {
        onData([]);
        return;
      }

      const competitionsQuery = query(
        collection(firestore, "competitions"),
        where(documentId(), "in", competitionIds.slice(0, 30)),
      );

      getDocs(competitionsQuery)
        .then((compSnapshot) => {
          const challenges = fromChallengeSnapshot(compSnapshot).sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          onData(challenges);
        })
        .catch(onError);
    },
    onError,
  );
}

export function listenChallengeDetail(
  competitionId: string,
  onData: (detail: ChallengeDetail) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const firestore = assertDb();
  let teams: Team[] = [];
  let invites: Invite[] = [];
  let activityRules: ActivityRule[] = [];

  const emit = () => {
    onData({ teams, invites, activityRules });
  };

  const unsubscribers = [
    onSnapshot(
      collection(firestore, "competitions", competitionId, "teams"),
      (snapshot) => {
        teams = snapshot.docs
          .map((teamDoc) => {
            const data = teamDoc.data();

            return {
              id: teamDoc.id,
              name: String(data.name ?? ""),
              color: String(data.color ?? "#2563eb"),
            } satisfies Team;
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        emit();
      },
      onError,
    ),
    onSnapshot(
      collection(firestore, "competitions", competitionId, "invites"),
      (snapshot) => {
        invites = snapshot.docs
          .map((inviteDoc) => {
            const data = inviteDoc.data();

            return {
              id: inviteDoc.id,
              code: String(data.code ?? ""),
              teamId: typeof data.teamId === "string" ? data.teamId : null,
              usedCount: Number(data.usedCount ?? 0),
              maxUses: typeof data.maxUses === "number" ? data.maxUses : null,
              disabledAt: data.disabledAt ?? null,
            } satisfies Invite;
          })
          .sort((a, b) => a.code.localeCompare(b.code));
        emit();
      },
      onError,
    ),
    onSnapshot(
      collection(firestore, "competitions", competitionId, "activityRules"),
      (snapshot) => {
        activityRules = snapshot.docs
          .map((ruleDoc) => {
            const data = ruleDoc.data();
            const scoring = data.scoring as { points?: unknown } | undefined;

            return {
              id: ruleDoc.id,
              name: String(data.name ?? ""),
              category: String(data.category ?? "custom"),
              enabled: Boolean(data.enabled),
              requiresProof: Boolean(data.requiresProof),
              scoring: {
                type: "fixed",
                points: Number(scoring?.points ?? 0),
              },
            } satisfies ActivityRule;
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        emit();
      },
      onError,
    ),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function createChallenge(
  user: User,
  input: CreateChallengeInput,
) {
  const firestore = assertDb();
  const competitionRef = doc(collection(firestore, "competitions"));
  const creatorMemberRef = doc(
    firestore,
    "competitions",
    competitionRef.id,
    "members",
    user.uid,
  );
  const batch = writeBatch(firestore);
  const now = serverTimestamp();

  batch.set(competitionRef, {
    name: input.name.trim(),
    description: input.description.trim(),
    createdBy: user.uid,
    adminIds: [user.uid],
    status: "draft",
    settings: {
      activityApprovalMode: "auto",
      proofRequired: false,
      weekStartsOn: 1,
      allowMoreThanTwoTeams: true,
    },
    createdAt: now,
    updatedAt: now,
  });

  batch.set(creatorMemberRef, {
    userId: user.uid,
    displayNameSnapshot: user.displayName ?? user.email ?? "Challenge admin",
    emailSnapshot: user.email ?? null,
    teamId: null,
    role: "admin",
    status: "active",
    joinedAt: now,
    invitedBy: user.uid,
  });

  await batch.commit();

  return competitionRef.id;
}

export async function createTeam(input: CreateTeamInput) {
  const firestore = assertDb();

  await addDoc(collection(firestore, "competitions", input.competitionId, "teams"), {
    name: input.name.trim(),
    color: input.color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createInvite(input: CreateInviteInput, createdBy: string) {
  const firestore = assertDb();

  await addDoc(
    collection(firestore, "competitions", input.competitionId, "invites"),
    {
      code: createInviteCode(),
      createdBy,
      teamId: input.teamId,
      maxUses: input.maxUses,
      usedCount: 0,
      expiresAt: null,
      createdAt: serverTimestamp(),
      disabledAt: null,
    },
  );
}

export async function createActivityRule(input: CreateActivityRuleInput) {
  const firestore = assertDb();
  const now = serverTimestamp();

  await addDoc(
    collection(firestore, "competitions", input.competitionId, "activityRules"),
    {
      name: input.name.trim(),
      category: input.category.trim().toLowerCase() || "custom",
      enabled: true,
      inputType: "completion",
      scoring: {
        type: "fixed",
        points: input.points,
      },
      limits: {
        countsTowardWeeklyExtraCap: true,
      },
      requiresProof: input.requiresProof,
      createdAt: now,
      updatedAt: now,
    },
  );
}

export async function setActivityRuleEnabled(
  competitionId: string,
  activityRuleId: string,
  enabled: boolean,
) {
  const firestore = assertDb();

  await updateDoc(
    doc(firestore, "competitions", competitionId, "activityRules", activityRuleId),
    {
      enabled,
      updatedAt: serverTimestamp(),
    },
  );
}
