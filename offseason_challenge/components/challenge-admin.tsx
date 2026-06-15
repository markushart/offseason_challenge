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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow leading-none mb-1">
            {selectedChallenge ? "Challenge Dashboard" : "Getting Started"}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-brand-strong sm:text-4xl">
            {selectedChallenge ? selectedChallenge.name : "Create a new challenge"}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted font-medium">
            {selectedChallenge 
              ? selectedChallenge.description || "Manage teams, invites, and activities."
              : "Welcome! Create a new team competition to get started."}
          </p>
        </div>

        {selectedChallenge && (
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0">
            <Metric label="Status" value={selectedChallenge.status} />
            <Metric label="Teams" value={String(activeDetail.teams.length)} />
            <Metric label="Activities" value={String(activeDetail.activityRules.length)} />
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
        <div className="max-w-xl mx-auto w-full py-8">
          <div className="panel flex flex-col gap-6">
            <h2 className="text-xl font-bold text-brand-strong">New challenge</h2>
            <form className="grid gap-4" onSubmit={handleCreateChallenge}>
              <label>
                <span>Challenge Name</span>
                <input
                  maxLength={80}
                  name="challengeName"
                  placeholder="Handball Offseason 2026"
                />
              </label>
              <label>
                <span>Description</span>
                <input
                  maxLength={240}
                  name="challengeDescription"
                  placeholder="Preseason points competition for the senior team"
                />
              </label>
              <button
                className="button-primary mt-2"
                disabled={isSaving || !hasFirebaseConfig}
                type="submit"
              >
                {isSaving ? "Creating..." : "Create challenge"}
              </button>
            </form>
          </div>
        </div>
      ) : isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-3">
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
        </div>
      ) : selectedChallenge ? (
        <div className="p-16 text-center border-2 border-dashed border-line rounded-2xl bg-surface-soft/50">
          <h2 className="text-2xl font-bold text-brand-strong">Welcome to {selectedChallenge.name}</h2>
          <p className="mt-3 text-muted font-medium max-w-md mx-auto">
            Participant view coming soon. You are currently a member of this team.
          </p>
        </div>
      ) : null}
    </div>
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
    <section className="panel flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Teams</h2>
      <form className="grid gap-4" onSubmit={onCreateTeam}>
        <label>
          <span>Team name</span>
          <input
            maxLength={50}
            name="teamName"
            placeholder="Team Blue"
          />
        </label>
        <label>
          <span>Color</span>
          <select name="teamColor">
            {teamColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button-primary"
          disabled={isSaving}
          type="submit"
        >
          Add team
        </button>
      </form>

      <div className="mt-2 flex flex-col gap-2">
        {teams.length === 0 ? (
          <p className="p-3 text-sm text-muted italic bg-surface-soft rounded-lg">
            No teams yet.
          </p>
        ) : null}
        {teams.map((team) => (
          <div
            className="flex items-center justify-between rounded-lg border border-line bg-surface-soft/30 p-4"
            key={team.id}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded-full shadow-sm"
                style={{ backgroundColor: team.color }}
              />
              <span className="font-bold text-brand-strong">{team.name}</span>
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
    <section className="panel flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Invites</h2>
      <form className="grid gap-4" onSubmit={onCreateInvite}>
        <label>
          <span>Assign to team</span>
          <select name="inviteTeamId">
            <option value="">Unassigned</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Max uses</span>
          <input
            min={1}
            name="maxUses"
            placeholder="No limit"
            type="number"
          />
        </label>
        <button
          className="button-primary"
          disabled={isSaving}
          type="submit"
        >
          Generate invite
        </button>
      </form>

      <div className="mt-2 flex flex-col gap-2">
        {invites.length === 0 ? (
          <p className="p-3 text-sm text-muted italic bg-surface-soft rounded-lg">
            No invite codes yet.
          </p>
        ) : null}
        {invites.map((invite) => (
          <div
            className="rounded-lg border border-line bg-surface-soft/30 p-4"
            key={invite.id}
          >
            <div className="flex items-center justify-between gap-3">
              <code className="rounded bg-white border border-line px-3 py-1 font-mono text-base font-black text-brand-strong">
                {invite.code}
              </code>
              <span className="text-xs font-black text-muted uppercase tracking-tighter">
                {invite.usedCount}/{invite.maxUses ?? "∞"} Uses
              </span>
            </div>
            <p className="mt-3 text-xs font-extrabold text-muted uppercase tracking-wide">
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
    <section className="panel flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Activities</h2>
      <form className="grid gap-4" onSubmit={onCreateActivity}>
        <label>
          <span>Activity name</span>
          <input
            maxLength={80}
            name="activityName"
            placeholder="Running / Jogging"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_90px]">
          <label>
            <span>Category</span>
            <input
              maxLength={40}
              name="activityCategory"
              placeholder="running"
            />
          </label>
          <label>
            <span>Points</span>
            <input
              max={50}
              min={1}
              name="activityPoints"
              type="number"
            />
          </label>
        </div>
        <label className="flex min-h-[46px] items-center gap-3 rounded-lg border border-line px-3 bg-white">
          <input className="h-5 w-5 accent-brand" name="requiresProof" type="checkbox" />
          <span className="text-sm font-bold text-muted">Requires proof</span>
        </label>
        <button
          className="button-primary"
          disabled={isSaving}
          type="submit"
        >
          Add activity
        </button>
      </form>

      <div className="mt-2 flex flex-col gap-2">
        {activityRules.length === 0 ? (
          <p className="p-3 text-sm text-muted italic bg-surface-soft rounded-lg">
            No activities yet.
          </p>
        ) : null}
        {activityRules.map((activityRule) => (
          <div
            className="rounded-lg border border-line bg-surface-soft/30 p-4"
            key={activityRule.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-brand-strong truncate">{activityRule.name}</p>
                <p className="mt-1 text-xs font-extrabold text-muted uppercase tracking-wider">
                  {activityRule.category} · {activityRule.scoring.points} pts
                </p>
              </div>
              <button
                className={`rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-widest transition ${
                  activityRule.enabled
                    ? "bg-ok/10 text-ok border border-ok/20"
                    : "bg-muted/10 text-muted border border-muted/20"
                }`}
                onClick={() => onToggleActivity(activityRule)}
                type="button"
              >
                {activityRule.enabled ? "Active" : "Paused"}
              </button>
            </div>
            {activityRule.requiresProof ? (
              <p className="mt-2 text-[10px] font-black uppercase tracking-tighter text-accent">Proof required</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile min-w-[120px]">
      <span>{label}</span>
      <strong className="text-brand-strong uppercase">{value}</strong>
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
      ? "border-danger/20 bg-danger/10 text-danger"
      : "border-accent/20 bg-accent/10 text-accent";

  return (
    <p className={`rounded-lg border p-4 text-sm font-bold ${classes}`}>{children}</p>
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
