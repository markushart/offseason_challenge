import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChallengeAdmin } from "@/components/challenge-admin";

const mocks = vi.hoisted(() => ({
  copyChallenge: vi.fn(),
  createActivityLog: vi.fn(),
  createActivityRule: vi.fn(),
  createChallenge: vi.fn(),
  createInvite: vi.fn(),
  createTeam: vi.fn(),
  deleteActivityLog: vi.fn(),
  deleteActivityRule: vi.fn(),
  deleteChallenge: vi.fn(),
  listenChallenge: vi.fn(),
  listenChallengeDetail: vi.fn(),
  promoteParticipant: vi.fn(),
  removeParticipant: vi.fn(),
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
  copyChallenge: mocks.copyChallenge,
  createActivityLog: mocks.createActivityLog,
  createActivityRule: mocks.createActivityRule,
  createChallenge: mocks.createChallenge,
  createInvite: mocks.createInvite,
  createTeam: mocks.createTeam,
  deleteActivityLog: mocks.deleteActivityLog,
  deleteActivityRule: mocks.deleteActivityRule,
  deleteChallenge: mocks.deleteChallenge,
  listenChallenge: mocks.listenChallenge,
  listenChallengeDetail: mocks.listenChallengeDetail,
  promoteParticipant: mocks.promoteParticipant,
  removeParticipant: mocks.removeParticipant,
}));

describe("ChallengeAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.copyChallenge.mockResolvedValue("challenge-copy");
    mocks.createActivityRule.mockResolvedValue(undefined);
    mocks.createActivityLog.mockResolvedValue(undefined);
    mocks.createChallenge.mockResolvedValue("challenge-1");
    mocks.createInvite.mockResolvedValue(undefined);
    mocks.createTeam.mockResolvedValue(undefined);
    mocks.deleteActivityLog.mockResolvedValue(undefined);
    mocks.deleteActivityRule.mockResolvedValue(undefined);
    mocks.deleteChallenge.mockResolvedValue(undefined);
    mocks.promoteParticipant.mockResolvedValue(undefined);
    mocks.removeParticipant.mockResolvedValue(undefined);

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
        activityLogs: [],
      });

      return vi.fn();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a team and resets the form without losing the submit target", async () => {
    const user = userEvent.setup();
    render(
      <ChallengeAdmin 
        selectedChallengeId="challenge-1" 
        onChallengeCreated={() => {}} 
        onChallengeDeleted={() => {}}
      />
    );

    // Wait for the challenge title to appear
    await screen.findByText("Summer Challenge");
    expect(screen.queryByRole("button", { name: /details bearbeiten/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    expect(screen.getByRole("button", { name: /details bearbeiten/i })).toBeInTheDocument();

    const teamNameInput = screen.getByLabelText(/teamname/i);
    await user.type(teamNameInput, "Team Red");
    
    // In our new UI, color is an input type="color"
    const colorInput = screen.getByLabelText(/farbe/i);
    // userEvent.type doesn't work well with type="color" in jsdom usually, 
    // but we can at least check if it exists and change its value.
    // However, userEvent.selectOptions definitely won't work.
    vi.mocked(colorInput).value = "#dc2626";
    
    await user.click(screen.getByRole("button", { name: /^team hinzufuegen$/i }));

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

  it("archives a challenge after delete confirmation", async () => {
    const user = userEvent.setup();
    const onChallengeDeleted = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={onChallengeDeleted}
      />,
    );

    await screen.findByText("Summer Challenge");
    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    await user.click(screen.getByRole("button", { name: /^challenge loeschen$/i }));

    await waitFor(() => {
      expect(mocks.deleteChallenge).toHaveBeenCalledWith("challenge-1");
    });
    expect(onChallengeDeleted).toHaveBeenCalledTimes(1);
  });

  it("copies challenge setup into a new challenge with fresh points", async () => {
    const user = userEvent.setup();
    const onChallengeCreated = vi.fn();
    const detail = {
      teams: [{ id: "team-blue", name: "Team Blue", color: "#2563eb" }],
      invites: [],
      activityRules: [
        {
          id: "rule-1",
          name: "Running",
          category: "running",
          enabled: true,
          requiresProof: false,
          scoring: { type: "fixed" as const, points: 5 },
        },
      ],
      members: [
        {
          userId: "user-1",
          displayNameSnapshot: "Admin User",
          emailSnapshot: "admin@example.com",
          teamId: "team-blue",
          role: "admin" as const,
          status: "active" as const,
          joinedAt: null,
        },
        {
          userId: "user-2",
          displayNameSnapshot: "Player One",
          emailSnapshot: "player@example.com",
          teamId: "team-blue",
          role: "participant" as const,
          status: "active" as const,
          joinedAt: null,
        },
      ],
      activityLogs: [
        {
          id: "log-1",
          userId: "user-2",
          teamId: "team-blue",
          activityRuleId: "rule-1",
          activityNameSnapshot: "Running",
          activityDate: new Date("2026-06-05"),
          calculatedPoints: 5,
          finalPoints: 5,
          status: "accepted" as const,
          createdAt: null,
        },
      ],
    };

    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData(detail);
      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={onChallengeCreated}
        onChallengeDeleted={() => {}}
      />,
    );

    await screen.findByText("Summer Challenge");
    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    await user.clear(screen.getByLabelText(/name der neuen challenge/i));
    await user.type(screen.getByLabelText(/name der neuen challenge/i), "Summer Challenge 2027");
    await user.type(screen.getByLabelText(/^start$/i), "2027-06-01");
    await user.type(screen.getByLabelText(/^ende$/i), "2027-08-31");
    await user.click(screen.getByRole("button", { name: /^challenge kopieren$/i }));

    await waitFor(() => {
      expect(mocks.copyChallenge).toHaveBeenCalledWith(
        expect.objectContaining({ uid: "user-1" }),
        expect.objectContaining({
          sourceChallenge: expect.objectContaining({ id: "challenge-1" }),
          detail,
          name: "Summer Challenge 2027",
          startsAt: "2027-06-01",
          endsAt: "2027-08-31",
        }),
      );
    });
    expect(onChallengeCreated).toHaveBeenCalledWith("challenge-copy");
  });

  it("shows team progress from each member's current team assignment", async () => {
    mocks.listenChallenge.mockImplementation((_id, onData) => {
      onData({
        id: "challenge-1",
        name: "Summer Challenge",
        description: "Preseason setup",
        status: "active",
        adminIds: ["admin-1"],
        createdBy: "admin-1",
        startsAt: new Date("2026-06-01"),
        endsAt: new Date("2026-08-31"),
      });

      return vi.fn();
    });
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [
          { id: "team-blue", name: "Team Blue", color: "#2563eb" },
          { id: "team-red", name: "Team Red", color: "#dc2626" },
        ],
        invites: [],
        activityRules: [],
        members: [
          {
            userId: "user-1",
            displayNameSnapshot: "Admin User",
            emailSnapshot: "admin@example.com",
            teamId: "team-blue",
            role: "participant",
            status: "active",
            joinedAt: null,
          },
          {
            userId: "user-2",
            displayNameSnapshot: "Second User",
            emailSnapshot: "second@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [
          {
            id: "log-1",
            userId: "user-1",
            teamId: null,
            activityRuleId: "rule-1",
            activityNameSnapshot: "Running",
            activityDate: new Date("2026-06-05"),
            calculatedPoints: 5,
            finalPoints: 5,
            status: "accepted",
            createdAt: null,
          },
        ],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    expect(await screen.findByText("Wertung")).toBeInTheDocument();
    expect(screen.getByText("Team Blue")).toBeInTheDocument();
    expect(screen.getByText("Team Red")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText("1 aktive Person wartet auf ein Team.")).toBeInTheDocument();
    expect(screen.queryByText(/Punkte wurden eingetragen, bevor Mitglieder einem Team zugeordnet waren/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Participant view coming soon. You are currently a member of this team.")).not.toBeInTheDocument();
  });

  it("lets admins remove participants without showing email addresses", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [],
        invites: [],
        activityRules: [],
        members: [
          {
            userId: "user-2",
            displayNameSnapshot: "Player One",
            emailSnapshot: "player@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    expect(await screen.findByText("Player One")).toBeInTheDocument();
    expect(screen.queryByText("player@example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^entfernen$/i }));

    await waitFor(() => {
      expect(mocks.removeParticipant).toHaveBeenCalledWith("challenge-1", "user-2");
    });
  });

  it("lets admins promote participants to admins", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [],
        invites: [],
        activityRules: [],
        members: [
          {
            userId: "user-2",
            displayNameSnapshot: "Player One",
            emailSnapshot: "player@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    expect(await screen.findByText("Player One")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /zum admin machen/i }));

    await waitFor(() => {
      expect(mocks.promoteParticipant).toHaveBeenCalledWith("challenge-1", "user-2");
    });
  });

  it("lets admins remove activity rules", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [],
        invites: [],
        activityRules: [
          {
            id: "rule-1",
            name: "Running",
            category: "running",
            enabled: true,
            requiresProof: false,
            scoring: { type: "fixed", points: 5 },
          },
        ],
        members: [],
        activityLogs: [],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await screen.findByText("Summer Challenge");
    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    await user.click(screen.getByRole("button", { name: /^entfernen$/i }));

    await waitFor(() => {
      expect(mocks.deleteActivityRule).toHaveBeenCalledWith("challenge-1", "rule-1");
    });
  });

  it("creates activities from name and points only", async () => {
    const user = userEvent.setup();

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await screen.findByText("Summer Challenge");
    await user.click(screen.getByRole("button", { name: /^admin$/i }));
    expect(screen.queryByLabelText(/kategorie/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nachweis/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/aktivitaetsname/i), "Running");
    await user.type(screen.getByLabelText(/punkte/i), "5");
    await user.click(screen.getByRole("button", { name: /^aktivitaet hinzufuegen$/i }));

    await waitFor(() => {
      expect(mocks.createActivityRule).toHaveBeenCalledWith({
        competitionId: "challenge-1",
        name: "Running",
        category: "custom",
        points: 5,
        requiresProof: false,
      });
    });
  });

  it("lets admins remove mistaken activity entries", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [],
        invites: [],
        activityRules: [],
        members: [
          {
            userId: "user-1",
            displayNameSnapshot: "Admin User",
            emailSnapshot: "admin@example.com",
            teamId: null,
            role: "admin",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [
          {
            id: "log-1",
            userId: "user-2",
            teamId: null,
            activityRuleId: "rule-1",
            activityNameSnapshot: "Running",
            activityDate: new Date("2026-06-05"),
            calculatedPoints: 5,
            finalPoints: 5,
            status: "accepted",
            createdAt: null,
          },
        ],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    expect((await screen.findAllByText("Running")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /^entfernen$/i }));

    await waitFor(() => {
      expect(mocks.deleteActivityLog).toHaveBeenCalledWith("challenge-1", "log-1");
    });
  });

  it("lets admins expand the activity feed and remove older entries", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const activityLogs = Array.from({ length: 9 }, (_, index) => ({
      id: `log-${index + 1}`,
      userId: "user-2",
      teamId: null,
      activityRuleId: "rule-1",
      activityNameSnapshot: index === 8 ? "Old Activity" : `Activity ${index + 1}`,
      activityDate: new Date(`2026-06-${String(index + 1).padStart(2, "0")}`),
      calculatedPoints: 5,
      finalPoints: 5,
      status: "accepted" as const,
      createdAt: null,
    }));
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [],
        invites: [],
        activityRules: [],
        members: [
          {
            userId: "user-1",
            displayNameSnapshot: "Admin User",
            emailSnapshot: "admin@example.com",
            teamId: null,
            role: "admin",
            status: "active",
            joinedAt: null,
          },
          {
            userId: "user-2",
            displayNameSnapshot: "Player Two",
            emailSnapshot: "player-two@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs,
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await screen.findByText("Activity 1");
    expect(screen.queryByText("Old Activity")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /alle anzeigen/i }));

    const oldActivityName = await screen.findByText("Old Activity");
    const oldActivityCard = oldActivityName.closest("div")?.parentElement?.parentElement;

    expect(oldActivityCard).toBeTruthy();
    await user.click(
      within(oldActivityCard as HTMLElement).getByRole("button", { name: /^entfernen$/i }),
    );

    await waitFor(() => {
      expect(mocks.deleteActivityLog).toHaveBeenCalledWith("challenge-1", "log-9");
    });
  });

  it("lets members remove their own mistaken activity entries", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.listenChallenge.mockImplementation((_id, onData) => {
      onData({
        id: "challenge-1",
        name: "Summer Challenge",
        description: "Preseason setup",
        status: "active",
        adminIds: ["admin-1"],
        createdBy: "admin-1",
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
        members: [
          {
            userId: "user-1",
            displayNameSnapshot: "Player One",
            emailSnapshot: "player@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [
          {
            id: "log-1",
            userId: "user-1",
            teamId: null,
            activityRuleId: "rule-1",
            activityNameSnapshot: "Running",
            activityDate: new Date("2026-06-05"),
            calculatedPoints: 5,
            finalPoints: 5,
            status: "accepted",
            createdAt: null,
          },
          {
            id: "log-2",
            userId: "user-2",
            teamId: null,
            activityRuleId: "rule-1",
            activityNameSnapshot: "Cycling",
            activityDate: new Date("2026-06-06"),
            calculatedPoints: 3,
            finalPoints: 3,
            status: "accepted",
            createdAt: null,
          },
        ],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    expect((await screen.findAllByText("Running")).length).toBeGreaterThan(0);
    expect(screen.getByText("Cycling")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^entfernen$/i })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /^entfernen$/i }));

    await waitFor(() => {
      expect(mocks.deleteActivityLog).toHaveBeenCalledWith("challenge-1", "log-1");
    });
  });

  it("shows who completed each recent activity", async () => {
    mocks.listenChallenge.mockImplementation((_id, onData) => {
      onData({
        id: "challenge-1",
        name: "Summer Challenge",
        description: "Preseason setup",
        status: "active",
        adminIds: ["admin-1"],
        createdBy: "admin-1",
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
        members: [
          {
            userId: "user-1",
            displayNameSnapshot: "Player One",
            emailSnapshot: "player@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
          {
            userId: "user-2",
            displayNameSnapshot: "Player Two",
            emailSnapshot: "player-two@example.com",
            teamId: null,
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [
          {
            id: "log-1",
            userId: "user-1",
            teamId: null,
            activityRuleId: "rule-1",
            activityNameSnapshot: "Running",
            activityDate: new Date("2026-06-05"),
            calculatedPoints: 5,
            finalPoints: 5,
            status: "accepted",
            createdAt: null,
          },
          {
            id: "log-2",
            userId: "user-2",
            teamId: null,
            activityRuleId: "rule-2",
            activityNameSnapshot: "Cycling",
            activityDate: new Date("2026-06-06"),
            calculatedPoints: 3,
            finalPoints: 3,
            status: "accepted",
            createdAt: null,
          },
        ],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await screen.findByText("Running");
    expect(screen.getByText(/von player one/i)).toBeInTheDocument();
    expect(screen.getByText(/von player two/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /erledigte aktivitaeten/i })).not.toBeInTheDocument();
  });

  it("lets members add completed activity with a date", async () => {
    const user = userEvent.setup();
    mocks.listenChallenge.mockImplementation((_id, onData) => {
      onData({
        id: "challenge-1",
        name: "Summer Challenge",
        description: "Preseason setup",
        status: "active",
        adminIds: ["admin-1"],
        createdBy: "admin-1",
        startsAt: new Date("2026-06-01"),
        endsAt: new Date("2026-08-31"),
      });

      return vi.fn();
    });
    mocks.listenChallengeDetail.mockImplementation((_challengeId, onData) => {
      onData({
        teams: [{ id: "team-blue", name: "Team Blue", color: "#2563eb" }],
        invites: [],
        activityRules: [
          {
            id: "rule-1",
            name: "Running",
            category: "running",
            enabled: true,
            requiresProof: false,
            scoring: { type: "fixed", points: 5 },
          },
        ],
        members: [
          {
            userId: "user-1",
            displayNameSnapshot: "Player One",
            emailSnapshot: "player@example.com",
            teamId: "team-blue",
            role: "participant",
            status: "active",
            joinedAt: null,
          },
        ],
        activityLogs: [],
      });

      return vi.fn();
    });

    render(
      <ChallengeAdmin
        selectedChallengeId="challenge-1"
        onChallengeCreated={() => {}}
        onChallengeDeleted={() => {}}
      />,
    );

    await screen.findByText("Abgeschlossene Aktivitaet eintragen");
    await user.selectOptions(screen.getByLabelText(/^aktivitaet$/i), "rule-1");
    await user.clear(screen.getByLabelText(/datum/i));
    await user.type(screen.getByLabelText(/datum/i), "2026-06-10");
    await user.click(screen.getByRole("button", { name: /^aktivitaet eintragen$/i }));

    await waitFor(() => {
      expect(mocks.createActivityLog).toHaveBeenCalledWith({
        competitionId: "challenge-1",
        activityRule: expect.objectContaining({ id: "rule-1", name: "Running" }),
        activityDate: "2026-06-10",
        teamId: "team-blue",
        userId: "user-1",
      });
    });
  });
});
