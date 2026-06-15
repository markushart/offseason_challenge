import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChallengeAdmin } from "@/components/challenge-admin";

const mocks = vi.hoisted(() => ({
  createActivityRule: vi.fn(),
  createChallenge: vi.fn(),
  createInvite: vi.fn(),
  createTeam: vi.fn(),
  listenChallenge: vi.fn(),
  listenChallengeDetail: vi.fn(),
  setActivityRuleEnabled: vi.fn(),
}));

vi.mock("@/components/auth-shell", () => ({
  useSignedInUser: () => ({
    uid: "user-1",
    displayName: "Admin User",
    email: "admin@example.com",
  }),
}));

vi.mock("@/lib/firebase", () => ({
  hasFirebaseConfig: true,
  db: {}, // Mock db for firestore calls
}));

vi.mock("@/lib/challenges", () => ({
  createActivityRule: mocks.createActivityRule,
  createChallenge: mocks.createChallenge,
  createInvite: mocks.createInvite,
  createTeam: mocks.createTeam,
  listenChallenge: mocks.listenChallenge,
  listenChallengeDetail: mocks.listenChallengeDetail,
  setActivityRuleEnabled: mocks.setActivityRuleEnabled,
}));

describe("ChallengeAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createActivityRule.mockResolvedValue(undefined);
    mocks.createChallenge.mockResolvedValue("challenge-1");
    mocks.createInvite.mockResolvedValue(undefined);
    mocks.createTeam.mockResolvedValue(undefined);
    mocks.setActivityRuleEnabled.mockResolvedValue(undefined);

    mocks.listenChallenge.mockImplementation((_id, onData) => {
      onData({
        id: "challenge-1",
        name: "Summer Challenge",
        description: "Preseason setup",
        status: "active",
        adminIds: ["user-1"],
        createdBy: "user-1",
        startsAt: new Date("2026-06-01"),
        endsAt: new Date("2026-08-31"),
      });

      return vi.fn();
    });

    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [],
        invites: [],
        activityRules: [],
        members: [],
      });

      return vi.fn();
    });
  });

  it("creates a team and resets the form without losing the submit target", async () => {
    const user = userEvent.setup();
    render(
      <ChallengeAdmin 
        selectedChallengeId="challenge-1" 
        onChallengeCreated={() => {}} 
      />
    );

    // Wait for the challenge title to appear
    await screen.findByText("Summer Challenge");

    const teamNameInput = screen.getByLabelText(/team name/i);
    await user.type(teamNameInput, "Team Red");
    
    // In our new UI, color is an input type="color"
    const colorInput = screen.getByLabelText(/color/i);
    // userEvent.type doesn't work well with type="color" in jsdom usually, 
    // but we can at least check if it exists and change its value.
    // However, userEvent.selectOptions definitely won't work.
    vi.mocked(colorInput).value = "#dc2626";
    
    await user.click(screen.getByRole("button", { name: /^add team$/i }));

    await waitFor(() => {
      expect(mocks.createTeam).toHaveBeenCalledWith({
        competitionId: "challenge-1",
        name: "Team Red",
        color: "#dc2626",
      });
    });

    expect(teamNameInput).toHaveValue("");
    expect(
      screen.queryByText(/cannot read properties of null/i),
    ).not.toBeInTheDocument();
  });
});
