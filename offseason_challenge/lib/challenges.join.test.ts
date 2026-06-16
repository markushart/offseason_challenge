import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createActivityLog,
  createInvite,
  deleteActivityRule,
  deleteChallenge,
  joinChallenge,
  removeParticipant,
} from "@/lib/challenges";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  arrayRemove: vi.fn(),
  arrayUnion: vi.fn(),
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: {
    fromDate: vi.fn(),
  },
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  arrayRemove: mocks.arrayRemove,
  arrayUnion: mocks.arrayUnion,
  collection: mocks.collection,
  collectionGroup: mocks.collectionGroup,
  deleteDoc: mocks.deleteDoc,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
  where: mocks.where,
  writeBatch: mocks.writeBatch,
  Timestamp: mocks.Timestamp,
}));

describe("joinChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addDoc.mockResolvedValue({ id: "invite-1" });
    mocks.arrayRemove.mockReturnValue("member-array-remove");
    mocks.arrayUnion.mockReturnValue("member-array-union");
    mocks.collection.mockReturnValue("invites-collection");
    mocks.collectionGroup.mockReturnValue("invites-group");
    mocks.where.mockImplementation((field: string, op: string, value: string) => ({
      field,
      op,
      value,
    }));
    mocks.query.mockReturnValue("invite-query");
    mocks.serverTimestamp.mockReturnValue("ts");
    mocks.doc.mockReturnValue("member-ref");
    mocks.deleteDoc.mockResolvedValue(undefined);
    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.Timestamp.fromDate.mockReturnValue("activity-date");
  });

  it("creates reusable invites without usage limit fields", async () => {
    await createInvite(
      {
        competitionId: "competition-1",
      },
      "admin-1",
    );

    expect(mocks.collection).toHaveBeenCalledWith(
      {},
      "competitions",
      "competition-1",
      "invites",
    );
    expect(mocks.addDoc).toHaveBeenCalledWith(
      "invites-collection",
      expect.not.objectContaining({
        expiresAt: expect.anything(),
        maxUses: expect.anything(),
        teamId: expect.anything(),
        usedCount: expect.anything(),
      }),
    );
    expect(mocks.addDoc).toHaveBeenCalledWith(
      "invites-collection",
      expect.objectContaining({
        createdBy: "admin-1",
        disabledAt: null,
      }),
    );
  });

  it("archives a challenge when deleting", async () => {
    await deleteChallenge("competition-1");

    expect(mocks.doc).toHaveBeenCalledWith({}, "competitions", "competition-1");
    expect(mocks.updateDoc).toHaveBeenCalledWith("member-ref", {
      status: "archived",
      updatedAt: "ts",
    });
  });

  it("deletes an activity rule document", async () => {
    await deleteActivityRule("competition-1", "rule-1");

    expect(mocks.doc).toHaveBeenCalledWith(
      {},
      "competitions",
      "competition-1",
      "activityRules",
      "rule-1",
    );
    expect(mocks.deleteDoc).toHaveBeenCalledWith("member-ref");
  });

  it("creates a fixed-point activity log for the signed-in member", async () => {
    await createActivityLog({
      competitionId: "competition-1",
      userId: "user-1",
      teamId: "team-1",
      activityDate: "2026-06-10",
      activityRule: {
        id: "rule-1",
        name: "Running",
        category: "running",
        enabled: true,
        requiresProof: false,
        scoring: { type: "fixed", points: 5 },
      },
    });

    expect(mocks.collection).toHaveBeenCalledWith(
      {},
      "competitions",
      "competition-1",
      "activityLogs",
    );
    expect(mocks.Timestamp.fromDate).toHaveBeenCalledWith(
      new Date("2026-06-10T12:00:00"),
    );
    expect(mocks.addDoc).toHaveBeenCalledWith(
      "invites-collection",
      expect.objectContaining({
        userId: "user-1",
        teamId: "team-1",
        activityRuleId: "rule-1",
        activityNameSnapshot: "Running",
        activityDate: "activity-date",
        calculatedPoints: 5,
        finalPoints: 5,
        status: "accepted",
      }),
    );
  });

  it("marks a participant removed and removes them from challenge members", async () => {
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({ commit: batchCommit, update: batchUpdate });

    await removeParticipant("competition-1", "user-2");

    expect(batchUpdate).toHaveBeenCalledWith(
      "member-ref",
      expect.objectContaining({
        status: "removed",
        teamId: null,
      }),
    );
    expect(batchUpdate).toHaveBeenCalledWith(
      "member-ref",
      expect.objectContaining({
        memberIds: "member-array-remove",
        updatedAt: "ts",
      }),
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it("creates a participant membership from a valid invite code", async () => {
    const batchSet = vi.fn();
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);

    mocks.getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({ createdBy: "admin-1", disabledAt: null, teamId: "team-1" }),
          ref: { parent: { parent: { id: "competition-1" } } },
        },
      ],
    });
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.writeBatch.mockReturnValue({
      commit: batchCommit,
      set: batchSet,
      update: batchUpdate,
    });

    const competitionId = await joinChallenge(
      { displayName: "Player", email: "player@example.com", uid: "user-1" } as never,
      "abc123",
      "Player One",
    );

    expect(competitionId).toBe("competition-1");
    expect(mocks.where).toHaveBeenCalledWith("code", "==", "ABC123");
    expect(batchSet).toHaveBeenCalledWith(
      "member-ref",
      expect.objectContaining({
        userId: "user-1",
        displayNameSnapshot: "Player One",
        role: "participant",
        status: "active",
        teamId: null,
        invitedBy: "admin-1",
      }),
    );
    expect(batchUpdate).toHaveBeenCalledWith(
      "member-ref",
      expect.objectContaining({
        memberIds: "member-array-union",
        updatedAt: "ts",
      }),
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it("returns immediately when the user is already an active member", async () => {
    mocks.getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({ createdBy: "admin-1", disabledAt: null, teamId: null }),
          ref: { parent: { parent: { id: "competition-1" } } },
        },
      ],
    });
    mocks.getDoc.mockResolvedValue({
      data: () => ({ status: "active" }),
      exists: () => true,
    });

    const competitionId = await joinChallenge(
      { displayName: "Player", email: "player@example.com", uid: "user-1" } as never,
      "abc123",
      "Player One",
    );

    expect(competitionId).toBe("competition-1");
    expect(mocks.updateDoc).toHaveBeenCalledWith("member-ref", {
      displayNameSnapshot: "Player One",
    });
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it("throws for a disabled invite", async () => {
    mocks.getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({ createdBy: "admin-1", disabledAt: "ts", teamId: null }),
          ref: { parent: { parent: { id: "competition-1" } } },
        },
      ],
    });

    await expect(
      joinChallenge(
        { displayName: "Player", email: "player@example.com", uid: "user-1" } as never,
        "abc123",
        "Player One",
      ),
    ).rejects.toThrow("This invite has been disabled.");
  });
});
