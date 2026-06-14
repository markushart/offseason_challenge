"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSignedInUser } from "@/components/auth-shell";
import {
  createActivityRule,
  createChallenge,
  createInvite,
  createTeam,
  listenChallenge,
  listenChallengeDetail,
  setActivityRuleEnabled,
  type ActivityRule,
  type Challenge,
  type ChallengeDetail,
  type Team,
} from "@/lib/challenges";
import { hasFirebaseConfig } from "@/lib/firebase";

const teamColors = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

const emptyDetail: ChallengeDetail = {
  teams: [],
  invites: [],
  activityRules: [],
};

export function ChallengeAdmin({ 
  selectedChallengeId, 
  onChallengeCreated 
}: { 
  selectedChallengeId: string; 
  onChallengeCreated: (id: string) => void;
}) {
  const user = useSignedInUser();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [detail, setDetail] = useState<ChallengeDetail>(emptyDetail);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch only the selected challenge document
  useEffect(() => {
    if (!selectedChallengeId || !hasFirebaseConfig) {
      // Use a microtask to avoid synchronous setState in effect lint error
      Promise.resolve().then(() => setSelectedChallenge(null));
      return;
    }

    return listenChallenge(selectedChallengeId, setSelectedChallenge, (err) => setError(err.message));
  }, [selectedChallengeId]);

  useEffect(() => {
    if (!selectedChallengeId) {
      return;
    }

    return listenChallengeDetail(
      selectedChallengeId,
      setDetail,
      (listenError) => setError(listenError.message),
    );
  }, [selectedChallengeId]);

  const activeDetail = selectedChallengeId ? detail : emptyDetail;
  const isAdmin = selectedChallenge?.adminIds.includes(user.uid);

  const handleCreateChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("challengeName") ?? "").trim();
    const description = String(formData.get("challengeDescription") ?? "").trim();

    if (!name) {
      setError("Add a challenge name first.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const challengeId = await createChallenge(user, { name, description });
      onChallengeCreated(challengeId);
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedChallenge) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("teamName") ?? "").trim();
    const color = String(formData.get("teamColor") ?? teamColors[0]);

    if (!name) {
      setError("Add a team name first.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await createTeam({ competitionId: selectedChallenge.id, name, color });
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedChallenge) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const teamIdValue = String(formData.get("inviteTeamId") ?? "");
    const maxUsesValue = String(formData.get("maxUses") ?? "").trim();

    setError(null);
    setIsSaving(true);

    try {
      await createInvite(
        {
          competitionId: selectedChallenge.id,
          teamId: teamIdValue || null,
          maxUses: maxUsesValue ? Number(maxUsesValue) : null,
        },
        user.uid,
      );
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedChallenge) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("activityName") ?? "").trim();
    const category = String(formData.get("activityCategory") ?? "").trim();
    const points = Number(formData.get("activityPoints") ?? 0);
    const requiresProof = formData.get("requiresProof") === "on";

    if (!name || !Number.isInteger(points) || points < 1 || points > 50) {
      setError("Add an activity name and points between 1 and 50.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await createActivityRule({
        competitionId: selectedChallenge.id,
        name,
        category,
        points,
        requiresProof,
      });
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActivity = async (activityRule: ActivityRule) => {
    if (!selectedChallenge) {
      return;
    }

    setError(null);

    try {
      await setActivityRuleEnabled(
        selectedChallenge.id,
        activityRule.id,
        !activityRule.enabled,
      );
    } catch (updateError) {
      setError(getMessage(updateError));
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:text-sm">
              {selectedChallenge ? "Challenge Dashboard" : "Getting Started"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              {selectedChallenge ? selectedChallenge.name : "Create a new challenge"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              {selectedChallenge 
                ? selectedChallenge.description || "Manage teams, invites, and activities."
                : "Welcome! Create a new team competition to get started."}
            </p>
          </div>

          {selectedChallenge && (
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[420px]">
              <Metric label="Status" value={selectedChallenge.status} />
              <Metric label="Teams" value={String(activeDetail.teams.length)} />
              <Metric
                label="Activities"
                value={String(activeDetail.activityRules.length)}
              />
            </div>
          )}
        </header>

        {!hasFirebaseConfig ? (
          <Notice tone="warning">
            Firebase config is missing. Add your Firebase web app values to
            `offseason_challenge/.env.local` before using challenge management.
          </Notice>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}

        {!selectedChallengeId ? (
          <section className="max-w-xl mx-auto w-full">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">New challenge</h2>
              <form className="mt-4 grid gap-4" onSubmit={handleCreateChallenge}>
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Name
                  <input
                    className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
                    maxLength={80}
                    name="challengeName"
                    placeholder="Handball Offseason 2026"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Description
                  <input
                    className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
                    maxLength={240}
                    name="challengeDescription"
                    placeholder="Preseason points competition for the senior team"
                  />
                </label>
                <button
                  className="h-12 rounded-md bg-emerald-700 px-4 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving || !hasFirebaseConfig}
                  type="submit"
                >
                  Create challenge
                </button>
              </form>
            </div>
          </section>
        ) : isAdmin ? (
          <section className="grid gap-4 lg:grid-cols-3">
            <TeamPanel
              isSaving={isSaving}
              onCreateTeam={handleCreateTeam}
              teams={activeDetail.teams}
            />
            <InvitePanel
              invites={activeDetail.invites}
              isSaving={isSaving}
              onCreateInvite={handleCreateInvite}
              teams={activeDetail.teams}
            />
            <ActivityPanel
              activityRules={activeDetail.activityRules}
              isSaving={isSaving}
              onCreateActivity={handleCreateActivity}
              onToggleActivity={handleToggleActivity}
            />
          </section>
        ) : selectedChallenge ? (
          <section className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl">
            <h2 className="text-xl font-semibold">Welcome to {selectedChallenge.name}</h2>
            <p className="mt-2 text-zinc-600">Participant view coming soon. You are currently a member of this team.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function TeamPanel({
  teams,
  isSaving,
  onCreateTeam,
}: {
  teams: Team[];
  isSaving: boolean;
  onCreateTeam: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Teams</h2>
      <form className="mt-4 grid gap-4" onSubmit={onCreateTeam}>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Team name
          <input
            className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
            maxLength={50}
            name="teamName"
            placeholder="Team Blue"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Color
          <select
            className="h-12 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 sm:text-sm"
            name="teamColor"
          >
            {teamColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
        <button
          className="h-12 rounded-md bg-zinc-950 px-4 font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          Add team
        </button>
      </form>

      <div className="mt-4 grid gap-2">
        {teams.length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            No teams yet.
          </p>
        ) : null}
        {teams.map((team) => (
          <div
            className="flex items-center justify-between rounded-md border border-zinc-200 p-3"
            key={team.id}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <span className="font-medium">{team.name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InvitePanel({
  teams,
  invites,
  isSaving,
  onCreateInvite,
}: {
  teams: Team[];
  invites: ChallengeDetail["invites"];
  isSaving: boolean;
  onCreateInvite: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Invites</h2>
      <form className="mt-4 grid gap-4" onSubmit={onCreateInvite}>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Assign invite to team
          <select
            className="h-12 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 sm:text-sm"
            name="inviteTeamId"
          >
            <option value="">Unassigned</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Max uses
          <input
            className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
            min={1}
            name="maxUses"
            placeholder="No limit"
            type="number"
          />
        </label>
        <button
          className="h-12 rounded-md bg-zinc-950 px-4 font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          Generate invite
        </button>
      </form>

      <div className="mt-4 grid gap-2">
        {invites.length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            No invite codes yet.
          </p>
        ) : null}
        {invites.map((invite) => (
          <div
            className="rounded-md border border-zinc-200 p-3"
            key={invite.id}
          >
            <div className="flex items-center justify-between gap-3">
              <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-base font-semibold sm:text-sm">
                {invite.code}
              </code>
              <span className="text-sm text-zinc-500">
                {invite.usedCount}/{invite.maxUses ?? "∞"}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              {getTeamName(teams, invite.teamId)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({
  activityRules,
  isSaving,
  onCreateActivity,
  onToggleActivity,
}: {
  activityRules: ActivityRule[];
  isSaving: boolean;
  onCreateActivity: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActivity: (activityRule: ActivityRule) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Activities</h2>
      <form className="mt-4 grid gap-4" onSubmit={onCreateActivity}>
        <label className="grid gap-2 text-sm font-medium text-zinc-700">
          Activity name
          <input
            className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
            maxLength={80}
            name="activityName"
            placeholder="Running / Jogging"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Category
            <input
              className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
              maxLength={40}
              name="activityCategory"
              placeholder="running"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Points
            <input
              className="h-12 rounded-md border border-zinc-300 px-3 text-base text-zinc-950 sm:text-sm"
              max={50}
              min={1}
              name="activityPoints"
              type="number"
            />
          </label>
        </div>
        <label className="flex min-h-12 items-center gap-3 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700">
          <input className="h-5 w-5" name="requiresProof" type="checkbox" />
          Requires proof
        </label>
        <button
          className="h-12 rounded-md bg-zinc-950 px-4 font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          Add activity
        </button>
      </form>

      <div className="mt-4 grid gap-2">
        {activityRules.length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            No activities yet.
          </p>
        ) : null}
        {activityRules.map((activityRule) => (
          <div
            className="rounded-md border border-zinc-200 p-3"
            key={activityRule.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{activityRule.name}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {activityRule.category} · {activityRule.scoring.points} pts
                </p>
              </div>
              <button
                className={`min-h-10 rounded-md px-3 py-2 text-xs font-semibold ${
                  activityRule.enabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-zinc-100 text-zinc-600"
                }`}
                onClick={() => onToggleActivity(activityRule)}
                type="button"
              >
                {activityRule.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            {activityRule.requiresProof ? (
              <p className="mt-2 text-sm text-zinc-500">Proof required</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: string;
  tone: "error" | "warning";
}) {
  const classes =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <p className={`rounded-md border p-3 text-sm ${classes}`}>{children}</p>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getTeamName(teams: Team[], teamId: string | null) {
  if (!teamId) {
    return "Joins without a team assignment";
  }

  return teams.find((team) => team.id === teamId)?.name ?? "Unknown team";
}
