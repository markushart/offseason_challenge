import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInvite, joinChallenge } from "@/lib/challenges";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  collectionGroup: mocks.collectionGroup,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  where: mocks.where,
  writeBatch: mocks.writeBatch,
}));

describe("joinChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addDoc.mockResolvedValue({ id: "invite-1" });
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
  });

  it("creates reusable invites without usage limit fields", async () => {
    await createInvite(
      {
        competitionId: "competition-1",
        teamId: null,
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
        usedCount: expect.anything(),
      }),
    );
    expect(mocks.addDoc).toHaveBeenCalledWith(
      "invites-collection",
      expect.objectContaining({
        createdBy: "admin-1",
        disabledAt: null,
        teamId: null,
      }),
    );
  });

  it("creates a participant membership from a valid invite code", async () => {
    const batchSet = vi.fn();
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
    mocks.writeBatch.mockReturnValue({ commit: batchCommit, set: batchSet });

    const competitionId = await joinChallenge(
      { displayName: "Player", email: "player@example.com", uid: "user-1" } as never,
      "abc123",
    );

    expect(competitionId).toBe("competition-1");
    expect(mocks.where).toHaveBeenCalledWith("code", "==", "ABC123");
    expect(batchSet).toHaveBeenCalledWith(
      "member-ref",
      expect.objectContaining({
        userId: "user-1",
        role: "participant",
        status: "active",
        teamId: "team-1",
        invitedBy: "admin-1",
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
    );

    expect(competitionId).toBe("competition-1");
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
      ),
    ).rejects.toThrow("This invite has been disabled.");
  });
});
