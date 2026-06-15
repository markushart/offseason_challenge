import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
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
  status: "active" | "completed" | "archived";
  adminIds: string[];
  createdBy: string;
  startsAt: Date | null;
  endsAt: Date | null;
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

export type Member = {
  userId: string;
  displayNameSnapshot: string;
  emailSnapshot: string | null;
  teamId: string | null;
  role: "admin" | "participant";
  status: "active" | "invited" | "removed";
  joinedAt: Date | null;
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
  members: Member[];
};

export type CreateChallengeInput = {
  name: string;
  description: string;
  startsAt: string; // ISO date
  endsAt: string; // ISO date
};

export type UpdateChallengeInput = Partial<CreateChallengeInput> & {
  status?: Challenge["status"];
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
      status: data.status === "draft" ? "active" : (data.status ?? "active"),
      adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
      createdBy: String(data.createdBy ?? ""),
      startsAt: data.startsAt instanceof Timestamp ? data.startsAt.toDate() : null,
      endsAt: data.endsAt instanceof Timestamp ? data.endsAt.toDate() : null,
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
          status: data.status === "draft" ? "active" : (data.status ?? "active"),
          adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
          createdBy: String(data.createdBy ?? ""),
          startsAt: data.startsAt instanceof Timestamp ? data.startsAt.toDate() : null,
          endsAt: data.endsAt instanceof Timestamp ? data.endsAt.toDate() : null,
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
  let members: Member[] = [];

  const emit = () => {
    onData({ teams, invites, activityRules, members });
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
    onSnapshot(
      collection(firestore, "competitions", competitionId, "members"),
      (snapshot) => {
        members = snapshot.docs
          .map((memberDoc) => {
            const data = memberDoc.data();

            return {
              userId: memberDoc.id,
              displayNameSnapshot: String(data.displayNameSnapshot ?? ""),
              emailSnapshot: data.emailSnapshot ? String(data.emailSnapshot) : null,
              teamId: data.teamId ? String(data.teamId) : null,
              role: data.role ?? "participant",
              status: data.status ?? "active",
              joinedAt: data.joinedAt instanceof Timestamp ? data.joinedAt.toDate() : null,
            } satisfies Member;
          })
          .sort((a, b) => a.displayNameSnapshot.localeCompare(b.displayNameSnapshot));
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
    status: "active",
    startsAt: input.startsAt ? Timestamp.fromDate(new Date(input.startsAt)) : null,
    endsAt: input.endsAt ? Timestamp.fromDate(new Date(input.endsAt)) : null,
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

export async function updateChallenge(
  competitionId: string,
  input: UpdateChallengeInput,
) {
  const firestore = assertDb();
  const competitionRef = doc(firestore, "competitions", competitionId);
  
  const updates: DocumentData = {
    updatedAt: serverTimestamp(),
  };

  if (input.name) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.startsAt) updates.startsAt = Timestamp.fromDate(new Date(input.startsAt));
  if (input.endsAt) updates.endsAt = Timestamp.fromDate(new Date(input.endsAt));
  if (input.status) updates.status = input.status;

  await updateDoc(competitionRef, updates);
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

export async function assignTeam(
  competitionId: string,
  userId: string,
  teamId: string | null,
) {
  const firestore = assertDb();
  const memberRef = doc(firestore, "competitions", competitionId, "members", userId);

  await updateDoc(memberRef, {
    teamId,
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

export async function joinChallenge(user: User, code: string) {
  const firestore = assertDb();
  
  // Find the invite
  const invitesQuery = query(
    collectionGroup(firestore, "invites"),
    where("code", "==", code.toUpperCase()),
  );
  
  const inviteSnapshot = await getDocs(invitesQuery);
  if (inviteSnapshot.empty) {
    throw new Error("Invalid invite code.");
  }
  
  const inviteDoc = inviteSnapshot.docs[0];
  const inviteData = inviteDoc.data();
  const competitionId = inviteDoc.ref.parent.parent!.id;
  
  if (inviteData.disabledAt) {
    throw new Error("This invite has been disabled.");
  }
  
  if (inviteData.maxUses && inviteData.usedCount >= inviteData.maxUses) {
    throw new Error("This invite has reached its maximum use limit.");
  }
  
  // Check if already a member
  const memberRef = doc(firestore, "competitions", competitionId, "members", user.uid);
  const memberSnapshot = await getDoc(memberRef);
  
  if (memberSnapshot.exists() && memberSnapshot.data().status === "active") {
    return competitionId; // Already a member
  }
  
  const batch = writeBatch(firestore);
  const now = serverTimestamp();
  
  batch.set(memberRef, {
    userId: user.uid,
    displayNameSnapshot: user.displayName ?? user.email ?? "Participant",
    emailSnapshot: user.email ?? null,
    teamId: inviteData.teamId || null,
    role: "participant",
    status: "active",
    joinedAt: now,
    invitedBy: inviteData.createdBy,
  });
  
  batch.update(inviteDoc.ref, {
    usedCount: (inviteData.usedCount || 0) + 1,
    updatedAt: now,
  });
  
  await batch.commit();
  
  return competitionId;
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
