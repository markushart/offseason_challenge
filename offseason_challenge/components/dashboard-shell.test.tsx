import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "@/components/dashboard-shell";

const mocks = vi.hoisted(() => ({
  joinChallenge: vi.fn(),
  listenMemberChallenges: vi.fn(),
}));

vi.mock("@/components/auth-shell", () => ({
  useSignedInUser: () => ({
    uid: "user-1",
    displayName: "User One",
    email: "user@example.com",
  }),
}));

vi.mock("@/lib/challenges", () => ({
  joinChallenge: mocks.joinChallenge,
  listenMemberChallenges: mocks.listenMemberChallenges,
}));

describe("DashboardShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
    mocks.listenMemberChallenges.mockImplementation((_uid, onData) => {
      onData([]);
      return vi.fn();
    });
  });

  it("shows a join error if invite-link joining fails", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/?join=ABC123");
    mocks.joinChallenge.mockRejectedValue(new Error("Ungueltiger Einladungscode."));

    render(
      <DashboardShell>
        {({ selectedChallengeId }) => <div>Selected: {selectedChallengeId || "none"}</div>}
      </DashboardShell>,
    );

    await user.clear(await screen.findByLabelText(/dein name/i));
    await user.type(screen.getByLabelText(/dein name/i), "Player One");
    await user.click(screen.getByRole("button", { name: /^challenge beitreten$/i }));

    await screen.findByText("Ungueltiger Einladungscode.");
    expect(mocks.joinChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "user-1" }),
      "ABC123",
      "Player One",
    );
  });

  it("selects the challenge returned from invite-link join", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/?join=ABC123");
    mocks.joinChallenge.mockResolvedValue("competition-1");

    render(
      <DashboardShell>
        {({ selectedChallengeId }) => <div>Selected: {selectedChallengeId || "none"}</div>}
      </DashboardShell>,
    );

    await user.clear(await screen.findByLabelText(/dein name/i));
    await user.type(screen.getByLabelText(/dein name/i), "Player One");
    await user.click(screen.getByRole("button", { name: /^challenge beitreten$/i }));

    await waitFor(() => {
      expect(screen.getByText("Selected: competition-1")).toBeInTheDocument();
    });
  });

  it("shows member challenges in the sidebar menu", async () => {
    mocks.listenMemberChallenges.mockImplementation((_uid, onData) => {
      onData([
        {
          id: "competition-1",
          name: "Summer Challenge",
          description: "",
          status: "active",
          adminIds: ["user-1"],
          createdBy: "user-1",
          startsAt: null,
          endsAt: null,
        },
      ]);
      return vi.fn();
    });

    render(
      <DashboardShell>
        {({ selectedChallengeId }) => <div>Selected: {selectedChallengeId || "none"}</div>}
      </DashboardShell>,
    );

    expect(await screen.findByRole("button", { name: "Summer Challenge" })).toBeInTheDocument();
    expect(screen.getByText("Selected: competition-1")).toBeInTheDocument();
  });
});
