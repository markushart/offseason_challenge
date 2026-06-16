"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSignedInUser } from "@/components/auth-shell";
import {
  assignTeam,
  createActivityRule,
  createChallenge,
  createInvite,
  createTeam,
  deleteChallenge,
  listenChallenge,
  listenChallengeDetail,
  removeParticipant,
  setActivityRuleEnabled,
  updateChallenge,
  type ActivityRule,
  type Challenge,
  type ChallengeDetail,
  type Member,
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
  members: [],
};

export function ChallengeAdmin({ 
  selectedChallengeId, 
  onChallengeCreated,
  onChallengeDeleted,
}: { 
  selectedChallengeId: string; 
  onChallengeCreated: (id: string) => void;
  onChallengeDeleted: () => void;
}) {
  const user = useSignedInUser();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [detail, setDetail] = useState<ChallengeDetail>(emptyDetail);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch only the selected challenge document
  useEffect(() => {
    if (!selectedChallengeId || !hasFirebaseConfig) {
      Promise.resolve().then(() => setSelectedChallenge(null));
      return;
    }

    return listenChallenge(selectedChallengeId, setSelectedChallenge, (err) => setError(err.message));
  }, [selectedChallengeId]);

  useEffect(() => {
    if (!selectedChallengeId) {
      Promise.resolve().then(() => setDetail(emptyDetail));
      return;
    }

    if (!selectedChallenge) {
      return;
    }

    const canReadAdminDetail = selectedChallenge.adminIds.includes(user.uid);

    return listenChallengeDetail(
      selectedChallengeId,
      setDetail,
      (listenError) => setError(listenError.message),
      { includeAdminData: canReadAdminDetail },
    );
  }, [selectedChallenge, selectedChallengeId, user.uid]);

  const isAdmin = selectedChallenge?.adminIds.includes(user.uid);

  const handleCreateChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("challengeName") ?? "").trim();
    const description = String(formData.get("challengeDescription") ?? "").trim();
    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");

    if (!name || !startsAt || !endsAt) {
      setError("Add a name and both dates.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const challengeId = await createChallenge(user, { 
        name, 
        description,
        startsAt,
        endsAt
      });
      onChallengeCreated(challengeId);
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedChallenge) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("challengeName") ?? "").trim();
    const description = String(formData.get("challengeDescription") ?? "").trim();
    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");

    setError(null);
    setIsSaving(true);

    try {
      await updateChallenge(selectedChallenge.id, {
        name,
        description,
        startsAt,
        endsAt,
      });
      setIsEditing(false);
    } catch (updateError) {
      setError(getMessage(updateError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChallenge = async () => {
    if (!selectedChallenge) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${selectedChallenge.name}"? This will remove it from challenge lists.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await deleteChallenge(selectedChallenge.id);
      onChallengeDeleted();
    } catch (deleteError) {
      setError(getMessage(deleteError));
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

    setError(null);
    setIsSaving(true);

    try {
      await createInvite(
        {
          competitionId: selectedChallenge.id,
        },
        user.uid,
      );
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

  const handleAssignTeam = async (userId: string, teamId: string | null) => {
    if (!selectedChallenge) return;
    try {
      await assignTeam(selectedChallenge.id, userId, teamId);
    } catch (err) {
      setError(getMessage(err));
    }
  };

  const handleRemoveParticipant = async (member: Member) => {
    if (!selectedChallenge || member.role !== "participant") {
      return;
    }

    const confirmed = window.confirm(`Remove ${member.displayNameSnapshot} from this challenge?`);

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await removeParticipant(selectedChallenge.id, member.userId);
    } catch (err) {
      setError(getMessage(err));
    } finally {
      setIsSaving(false);
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
          <div className="mt-2 flex items-center gap-4">
             <p className="max-w-2xl text-base text-muted font-medium">
              {selectedChallenge 
                ? selectedChallenge.description || "Manage teams, invites, and activities."
                : "Welcome! Create a new team competition to get started."}
            </p>
            {isAdmin && selectedChallenge && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-black uppercase tracking-widest text-brand hover:underline"
              >
                {isEditing ? "Cancel" : "Edit Details"}
              </button>
            )}
          </div>
        </div>

        {selectedChallenge && !isEditing && (
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0">
            <Metric label="Starts" value={selectedChallenge.startsAt?.toLocaleDateString() ?? "-"} />
            <Metric label="Ends" value={selectedChallenge.endsAt?.toLocaleDateString() ?? "-"} />
            <Metric label="Teams" value={String(detail.teams.length)} />
            {isAdmin ? (
              <button
                className="button-secondary border-danger/30 text-danger hover:bg-danger/10"
                disabled={isSaving}
                onClick={handleDeleteChallenge}
                type="button"
              >
                Delete
              </button>
            ) : null}
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
                  required
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
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span>Starts At</span>
                  <input name="startsAt" required type="date" />
                </label>
                <label>
                  <span>Ends At</span>
                  <input name="endsAt" required type="date" />
                </label>
              </div>
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
      ) : isEditing && selectedChallenge ? (
        <div className="max-w-xl mx-auto w-full py-8">
          <div className="panel flex flex-col gap-6 shadow-xl border-brand/20">
            <h2 className="text-xl font-bold text-brand-strong">Edit challenge</h2>
            <form className="grid gap-4" onSubmit={handleUpdateChallenge}>
              <label>
                <span>Challenge Name</span>
                <input
                  defaultValue={selectedChallenge.name}
                  maxLength={80}
                  name="challengeName"
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <input
                  defaultValue={selectedChallenge.description}
                  maxLength={240}
                  name="challengeDescription"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span>Starts At</span>
                  <input 
                    defaultValue={selectedChallenge.startsAt?.toISOString().slice(0, 10)} 
                    name="startsAt" 
                    required 
                    type="date" 
                  />
                </label>
                <label>
                  <span>Ends At</span>
                  <input 
                    defaultValue={selectedChallenge.endsAt?.toISOString().slice(0, 10)} 
                    name="endsAt" 
                    required 
                    type="date" 
                  />
                </label>
              </div>
              <button
                className="button-primary mt-2"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : isAdmin ? (
        <div className="flex flex-col gap-6">
          <ChallengeOverview teams={detail.teams} members={detail.members} />

          <div className="grid gap-6 lg:grid-cols-3">
            <TeamPanel
              isSaving={isSaving}
              onCreateTeam={handleCreateTeam}
              teams={detail.teams}
            />
            <InvitePanel
              invites={detail.invites}
              isSaving={isSaving}
              onCreateInvite={handleCreateInvite}
            />
            <ActivityPanel
              activityRules={detail.activityRules}
              isSaving={isSaving}
              onCreateActivity={handleCreateActivity}
              onToggleActivity={handleToggleActivity}
            />
          </div>
          
          <MemberPanel 
            isSaving={isSaving}
            members={detail.members} 
            onAssignTeam={handleAssignTeam} 
            onRemoveParticipant={handleRemoveParticipant}
            teams={detail.teams} 
          />
        </div>
      ) : selectedChallenge ? (
        <ChallengeOverview teams={detail.teams} members={detail.members} />
      ) : null}
    </div>
  );
}

function ChallengeOverview({
  teams,
  members,
}: {
  teams: Team[];
  members: Member[];
}) {
  const activeMembers = members.filter((member) => member.status === "active");
  const unassignedMembers = activeMembers.filter((member) => !member.teamId);
  const teamRows = teams.map((team) => {
    const teamMembers = activeMembers.filter((member) => member.teamId === team.id);

    return {
      ...team,
      memberCount: teamMembers.length,
      points: 0,
    };
  });
  const highestPoints = Math.max(1, ...teamRows.map((team) => team.points));

  return (
    <section className="panel flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Team Progress</p>
          <h2 className="text-2xl font-bold text-brand-strong">Standings</h2>
        </div>
        <div className="flex gap-2">
          <Metric label="Teams" value={String(teams.length)} />
          <Metric label="Members" value={String(activeMembers.length)} />
        </div>
      </div>

      {teams.length === 0 ? (
        <p className="rounded-lg bg-surface-soft p-6 text-center text-sm font-medium text-muted">
          Teams will appear here once the challenge admin creates them.
        </p>
      ) : (
        <div className="grid gap-3">
          {teamRows.map((team, index) => (
            <div
              className="rounded-lg border border-line bg-surface-soft/30 p-4"
              key={team.id}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-sm font-black text-muted">#{index + 1}</span>
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-brand-strong">{team.name}</p>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
                <strong className="text-2xl font-black text-brand-strong">
                  {team.points}
                </strong>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: team.color,
                    width: `${Math.max(4, (team.points / highestPoints) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {unassignedMembers.length > 0 ? (
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Unassigned
          </p>
          <p className="mt-1 text-sm font-medium text-brand-strong">
            {unassignedMembers.length} active {unassignedMembers.length === 1 ? "member is" : "members are"} waiting for a team.
          </p>
        </div>
      ) : null}
    </section>
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
          <div className="flex gap-2 items-center">
             <input 
              className="w-12 h-12 p-1 cursor-pointer"
              defaultValue={teamColors[0]}
              name="teamColor"
              type="color" 
            />
            <span className="text-xs font-bold text-muted uppercase">Pick a color</span>
          </div>
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
  invites,
  isSaving,
  onCreateInvite,
}: {
  invites: ChallengeDetail["invites"];
  isSaving: boolean;
  onCreateInvite: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const invite = invites[0] ?? null;

  const copyLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?join=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="panel flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Invites</h2>
      {invite ? (
        <div className="rounded-lg border border-line bg-surface-soft/30 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Challenge link
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <code className="truncate rounded bg-white border border-line px-3 py-1 font-mono text-base font-black text-brand-strong">
              {invite.code}
            </code>
            <button
              onClick={() => copyLink(invite.code)}
              className="text-[10px] font-black uppercase tracking-widest bg-brand text-white px-2 py-1 rounded"
              type="button"
            >
              {copied === invite.code ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="mt-3 text-xs font-medium text-muted">
            New members join unassigned. Assign teams from the member list.
          </p>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={onCreateInvite}>
          <p className="rounded-lg bg-surface-soft p-3 text-sm font-medium text-muted">
            Generate one invitation link for this challenge.
          </p>
        <button
          className="button-primary"
          disabled={isSaving}
          type="submit"
        >
          Generate invite
        </button>
        </form>
      )}
    </section>
  );
}

function MemberPanel({
  isSaving,
  members,
  teams,
  onAssignTeam,
  onRemoveParticipant,
}: {
  isSaving: boolean;
  members: Member[];
  teams: Team[];
  onAssignTeam: (userId: string, teamId: string | null) => void;
  onRemoveParticipant: (member: Member) => void;
}) {
  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <section className="panel flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Members</h2>
      <div className="grid gap-2">
        {activeMembers.length === 0 ? (
          <p className="p-6 text-center text-muted italic bg-surface-soft rounded-lg">
            No members yet. Share an invite link to get started.
          </p>
        ) : null}
        {activeMembers.map((member) => (
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-line bg-surface-soft/30 p-4 gap-4"
            key={member.userId}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-brand-strong text-white font-black">
                {member.displayNameSnapshot.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-brand-strong truncate">{member.displayNameSnapshot}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <label className="!grid-cols-[auto_1fr] items-center gap-2">
                <span className="whitespace-nowrap">Team:</span>
                <select 
                  className="min-h-[38px] text-xs font-bold"
                  value={member.teamId || ""} 
                  onChange={(e) => onAssignTeam(member.userId, e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                member.role === 'admin' ? "bg-accent text-white" : "bg-muted/10 text-muted"
              }`}>
                {member.role}
              </span>
              {member.role === "participant" ? (
                <button
                  className="rounded border border-danger/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() => onRemoveParticipant(member)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
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
