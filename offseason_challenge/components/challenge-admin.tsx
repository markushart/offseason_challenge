"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSignedInUser } from "@/components/auth-shell";
import {
  assignTeam,
  copyChallenge,
  createActivityLog,
  createActivityRule,
  createChallenge,
  createInvite,
  createTeam,
  deleteActivityLog,
  deleteActivityRule,
  deleteChallenge,
  listenChallenge,
  listenChallengeDetail,
  removeParticipant,
  updateChallenge,
  type ActivityRule,
  type Challenge,
  type ChallengeDetail,
  type ActivityLog,
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
  activityLogs: [],
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
  const [activePane, setActivePane] = useState<"challenge" | "admin">("challenge");

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
      { currentUserId: user.uid, includeAdminData: canReadAdminDetail },
    );
  }, [selectedChallenge, selectedChallengeId, user.uid]);

  const isAdmin = selectedChallenge?.adminIds.includes(user.uid);
  const currentMember = detail.members.find((member) => member.userId === user.uid);

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

  const handleCopyChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedChallenge) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("copyChallengeName") ?? "").trim();
    const description = String(formData.get("copyChallengeDescription") ?? "").trim();
    const startsAt = String(formData.get("copyStartsAt") ?? "");
    const endsAt = String(formData.get("copyEndsAt") ?? "");

    if (!name || !startsAt || !endsAt) {
      setError("Add a copied challenge name and both dates.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const challengeId = await copyChallenge(user, {
        sourceChallenge: selectedChallenge,
        detail,
        name,
        description,
        startsAt,
        endsAt,
      });
      onChallengeCreated(challengeId);
      form.reset();
      setActivePane("challenge");
    } catch (copyError) {
      setError(getMessage(copyError));
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
    const points = Number(formData.get("activityPoints") ?? 0);

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
        category: "custom",
        points,
        requiresProof: false,
      });
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = async (activityRule: ActivityRule) => {
    if (!selectedChallenge) {
      return;
    }

    const confirmed = window.confirm(`Remove "${activityRule.name}" from this challenge?`);

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await deleteActivityRule(selectedChallenge.id, activityRule.id);
    } catch (deleteError) {
      setError(getMessage(deleteError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivityLog = async (activityLog: ActivityLog) => {
    if (!selectedChallenge) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${activityLog.activityNameSnapshot}" from recent activity?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await deleteActivityLog(selectedChallenge.id, activityLog.id);
    } catch (deleteError) {
      setError(getMessage(deleteError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateActivityLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedChallenge) {
      return;
    }

    if (!currentMember || currentMember.status !== "active") {
      setError("You must be an active challenge member to add activity.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const activityRuleId = String(formData.get("activityRuleId") ?? "");
    const activityDate = String(formData.get("activityDate") ?? "");
    const activityRule = detail.activityRules.find((rule) => rule.id === activityRuleId);

    if (!activityRule || !activityRule.enabled || !activityDate) {
      setError("Select an active activity and date.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await createActivityLog({
        competitionId: selectedChallenge.id,
        activityRule,
        activityDate,
        teamId: currentMember.teamId,
        userId: user.uid,
      });
      form.reset();
    } catch (createError) {
      setError(getMessage(createError));
    } finally {
      setIsSaving(false);
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
    <div className="flex min-w-0 flex-col gap-6">
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
          </div>
        </div>

        {selectedChallenge && (
          <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2 lg:flex">
            <Metric label="Starts" value={selectedChallenge.startsAt?.toLocaleDateString() ?? "-"} />
            <Metric label="Ends" value={selectedChallenge.endsAt?.toLocaleDateString() ?? "-"} />
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
      ) : isAdmin ? (
        <div className="flex min-w-0 flex-col gap-6 overflow-x-hidden">
          <PaneTabs activePane={activePane} onChange={setActivePane} />
          {activePane === "challenge" ? (
            <ChallengePane
              activityLogs={detail.activityLogs}
              activityRules={detail.activityRules}
              currentMember={currentMember}
              isAdmin={Boolean(isAdmin)}
              isSaving={isSaving}
              members={detail.members}
              onCreateActivityLog={handleCreateActivityLog}
              onDeleteActivityLog={handleDeleteActivityLog}
              teams={detail.teams}
            />
          ) : (
            <AdminPane
              activityRules={detail.activityRules}
              invites={detail.invites}
              isSaving={isSaving}
              isEditing={isEditing}
              members={detail.members}
              onAssignTeam={handleAssignTeam}
              onCreateActivity={handleCreateActivity}
              onCreateInvite={handleCreateInvite}
              onCreateTeam={handleCreateTeam}
              onCopyChallenge={handleCopyChallenge}
              onDeleteActivity={handleDeleteActivity}
              onDeleteChallenge={handleDeleteChallenge}
              onRemoveParticipant={handleRemoveParticipant}
              onToggleEdit={() => setIsEditing((current) => !current)}
              onUpdateChallenge={handleUpdateChallenge}
              teams={detail.teams}
              selectedChallenge={selectedChallenge}
            />
          )}
        </div>
      ) : selectedChallenge ? (
        <ChallengePane
          activityLogs={detail.activityLogs}
          activityRules={detail.activityRules}
          currentMember={currentMember}
          isAdmin={Boolean(isAdmin)}
          isSaving={isSaving}
          members={detail.members}
          onCreateActivityLog={handleCreateActivityLog}
          onDeleteActivityLog={handleDeleteActivityLog}
          teams={detail.teams}
        />
      ) : null}
    </div>
  );
}

function PaneTabs({
  activePane,
  onChange,
}: {
  activePane: "challenge" | "admin";
  onChange: (pane: "challenge" | "admin") => void;
}) {
  return (
    <div className="flex min-w-0 rounded-lg border border-line bg-surface-soft p-1">
      {(["challenge", "admin"] as const).map((pane) => (
        <button
          className={`min-w-0 flex-1 rounded-md px-2 py-2 text-sm font-black uppercase tracking-wide transition sm:px-4 sm:tracking-widest ${
            activePane === pane
              ? "bg-white text-brand-strong shadow-sm"
              : "text-muted hover:text-brand-strong"
          }`}
          key={pane}
          onClick={() => onChange(pane)}
          type="button"
        >
          {pane === "challenge" ? "Challenge" : "Admin"}
        </button>
      ))}
    </div>
  );
}

function ChallengePane({
  activityLogs,
  activityRules,
  currentMember,
  isAdmin,
  isSaving,
  members,
  onCreateActivityLog,
  onDeleteActivityLog,
  teams,
}: {
  activityLogs: ActivityLog[];
  activityRules: ActivityRule[];
  currentMember: Member | undefined;
  isAdmin: boolean;
  isSaving: boolean;
  members: Member[];
  onCreateActivityLog: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteActivityLog: (activityLog: ActivityLog) => void;
  teams: Team[];
}) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ChallengeOverview
        activityLogs={activityLogs}
        members={members}
        teams={teams}
      />
      <div className="flex flex-col gap-6">
        <ActivitySubmissionPanel
          activityRules={activityRules}
          currentMember={currentMember}
          isSaving={isSaving}
          onCreateActivityLog={onCreateActivityLog}
        />
        <ActivityFeedPanel
          activityLogs={activityLogs}
          currentUserId={currentMember?.userId}
          isAdmin={isAdmin}
          isSaving={isSaving}
          onDeleteActivityLog={onDeleteActivityLog}
        />
      </div>
    </div>
  );
}

function AdminPane({
  activityRules,
  isEditing,
  invites,
  isSaving,
  members,
  onAssignTeam,
  onCreateActivity,
  onCreateInvite,
  onCreateTeam,
  onCopyChallenge,
  onDeleteActivity,
  onDeleteChallenge,
  onRemoveParticipant,
  onToggleEdit,
  onUpdateChallenge,
  selectedChallenge,
  teams,
}: {
  activityRules: ActivityRule[];
  isEditing: boolean;
  invites: ChallengeDetail["invites"];
  isSaving: boolean;
  members: Member[];
  onAssignTeam: (userId: string, teamId: string | null) => void;
  onCreateActivity: (event: FormEvent<HTMLFormElement>) => void;
  onCreateInvite: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTeam: (event: FormEvent<HTMLFormElement>) => void;
  onCopyChallenge: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteActivity: (activityRule: ActivityRule) => void;
  onDeleteChallenge: () => void;
  onRemoveParticipant: (member: Member) => void;
  onToggleEdit: () => void;
  onUpdateChallenge: (event: FormEvent<HTMLFormElement>) => void;
  selectedChallenge: Challenge | null;
  teams: Team[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Challenge settings</p>
            <h2 className="text-xl font-bold text-brand-strong">Manage details</h2>
          </div>
          <button
            className="text-xs font-black uppercase tracking-widest text-brand hover:underline"
            onClick={onToggleEdit}
            type="button"
          >
            {isEditing ? "Close Details" : "Edit Details"}
          </button>
        </div>
        {isEditing && selectedChallenge ? (
          <form className="grid gap-4" onSubmit={onUpdateChallenge}>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <button className="button-primary mt-2 w-fit" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </form>
        ) : (
          <p className="text-sm font-medium text-muted">
            Challenge name, description, and dates are edited here by admins only.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <TeamPanel
          isSaving={isSaving}
          onCreateTeam={onCreateTeam}
          teams={teams}
        />
        <InvitePanel
          invites={invites}
          isSaving={isSaving}
          onCreateInvite={onCreateInvite}
        />
        <ActivityPanel
          activityRules={activityRules}
          isSaving={isSaving}
          onCreateActivity={onCreateActivity}
          onDeleteActivity={onDeleteActivity}
        />
      </div>

      <MemberPanel
        isSaving={isSaving}
        members={members}
        onAssignTeam={onAssignTeam}
        onRemoveParticipant={onRemoveParticipant}
        teams={teams}
      />

      <CopyChallengePanel
        activityRuleCount={activityRules.length}
        isSaving={isSaving}
        memberCount={members.filter((member) => member.status === "active").length}
        onCopyChallenge={onCopyChallenge}
        selectedChallenge={selectedChallenge}
      />

      <section className="panel flex flex-col gap-3 border-danger/20">
        <h2 className="text-lg font-bold uppercase tracking-wider text-danger">Danger zone</h2>
        <p className="text-sm font-medium text-muted">
          Archive this challenge and remove it from challenge lists.
        </p>
        <button
          className="button-secondary w-fit border-danger/30 text-danger hover:bg-danger/10"
          disabled={isSaving}
          onClick={onDeleteChallenge}
          type="button"
        >
          Delete challenge
        </button>
      </section>
    </div>
  );
}

function ChallengeOverview({
  activityLogs,
  teams,
  members,
}: {
  activityLogs: ActivityLog[];
  teams: Team[];
  members: Member[];
}) {
  const activeMembers = members.filter((member) => member.status === "active");
  const unassignedMembers = activeMembers.filter((member) => !member.teamId);
  const activeMemberTeamByUserId = new Map(
    activeMembers.map((member) => [member.userId, member.teamId]),
  );
  const memberRowsByTeam = new Map(
    teams.map((team) => {
      const teamMembers = activeMembers
        .filter((member) => member.teamId === team.id)
        .map((member) => {
          const points = activityLogs
            .filter(
              (activityLog) =>
                activityLog.status === "accepted" &&
                activityLog.userId === member.userId &&
                activeMemberTeamByUserId.get(activityLog.userId) === team.id,
            )
            .reduce((total, activityLog) => total + activityLog.finalPoints, 0);

          return {
            id: member.userId,
            name: member.displayNameSnapshot,
            points,
          };
        })
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      return [team.id, teamMembers] as const;
    }),
  );
  const teamRows = teams.map((team) => {
    const teamMembers = activeMembers.filter((member) => member.teamId === team.id);
    const points = activityLogs
      .filter(
        (activityLog) =>
          activityLog.status === "accepted" &&
          activeMemberTeamByUserId.get(activityLog.userId) === team.id,
      )
      .reduce((total, activityLog) => total + activityLog.finalPoints, 0);

    return {
      ...team,
      memberCount: teamMembers.length,
      points,
    };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const unassignedPoints = activityLogs
    .filter(
      (activityLog) =>
        activityLog.status === "accepted" &&
        activeMemberTeamByUserId.has(activityLog.userId) &&
        !activeMemberTeamByUserId.get(activityLog.userId),
    )
    .reduce((total, activityLog) => total + activityLog.finalPoints, 0);
  const highestPoints = Math.max(1, ...teamRows.map((team) => team.points));

  return (
    <section className="panel flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Team Progress</p>
          <h2 className="text-2xl font-bold text-brand-strong">Standings</h2>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto">
          <Metric label="Members" value={String(activeMembers.length)} />
        </div>
      </div>

      {teams.length === 0 ? (
        <p className="rounded-lg bg-surface-soft p-6 text-center text-sm font-medium text-muted">
          Teams will appear here once the challenge admin creates them.
        </p>
      ) : (
        <ol className="grid gap-3">
          {teamRows.map((team, index) => (
            <li
              className="min-w-0 rounded-lg border border-line bg-surface-soft/30 p-3 sm:p-4"
              key={team.id}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex-shrink-0 text-sm font-black text-muted">#{index + 1}</span>
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
              <details className="mt-4 min-w-0 rounded-lg border border-line bg-white/70 p-2 sm:p-3">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-muted">
                  Participant scores
                </summary>
                <div className="mt-3 grid gap-2">
                  {(memberRowsByTeam.get(team.id) ?? []).length === 0 ? (
                    <p className="text-sm font-medium text-muted">
                      No participants are assigned to this team yet.
                    </p>
                  ) : (
                    (memberRowsByTeam.get(team.id) ?? []).map((memberRow) => (
                      <div
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-surface-soft px-2 py-2 sm:px-3"
                        key={memberRow.id}
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-brand-strong">
                          {memberRow.name}
                        </span>
                        <strong className="text-sm font-black text-brand-strong">
                          {memberRow.points}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </details>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: team.color,
                    width: `${Math.max(4, (team.points / highestPoints) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
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

      {unassignedPoints > 0 ? (
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Unassigned points
          </p>
          <p className="mt-1 text-sm font-medium text-brand-strong">
            {unassignedPoints} points were logged before members received a team.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function ActivitySubmissionPanel({
  activityRules,
  currentMember,
  isSaving,
  onCreateActivityLog,
}: {
  activityRules: ActivityRule[];
  currentMember: Member | undefined;
  isSaving: boolean;
  onCreateActivityLog: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const enabledRules = activityRules.filter((activityRule) => activityRule.enabled);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="panel flex flex-col gap-4">
      <div>
        <p className="eyebrow">Your Activity</p>
        <h2 className="text-xl font-bold text-brand-strong">Add completed activity</h2>
      </div>
      {!currentMember || currentMember.status !== "active" ? (
        <p className="rounded-lg bg-surface-soft p-4 text-sm font-medium text-muted">
          You need to be an active member before logging activity.
        </p>
      ) : enabledRules.length === 0 ? (
        <p className="rounded-lg bg-surface-soft p-4 text-sm font-medium text-muted">
          No active activities are available yet.
        </p>
      ) : (
        <form className="grid gap-4" onSubmit={onCreateActivityLog}>
          <label>
            <span>Activity</span>
            <select name="activityRuleId" required>
              <option value="">Select activity</option>
              {enabledRules.map((activityRule) => (
                <option key={activityRule.id} value={activityRule.id}>
                  {activityRule.name} · {activityRule.scoring.points} pts
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Date completed</span>
            <input defaultValue={today} max={today} name="activityDate" required type="date" />
          </label>
          <button className="button-primary" disabled={isSaving} type="submit">
            Add activity
          </button>
        </form>
      )}
    </section>
  );
}

function ActivityFeedPanel({
  activityLogs,
  currentUserId,
  isAdmin,
  isSaving,
  onDeleteActivityLog,
}: {
  activityLogs: ActivityLog[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  isSaving: boolean;
  onDeleteActivityLog: (activityLog: ActivityLog) => void;
}) {
  const recentLogs = activityLogs.slice(0, 8);

  return (
    <section className="panel flex flex-col gap-4">
      <h2 className="text-lg font-bold uppercase tracking-wider text-brand-strong">
        Recent activity
      </h2>
      {recentLogs.length === 0 ? (
        <p className="rounded-lg bg-surface-soft p-4 text-sm font-medium text-muted">
          No activity has been logged yet.
        </p>
      ) : (
        <div className="grid gap-2">
          {recentLogs.map((activityLog) => (
            <div
              className="rounded-lg border border-line bg-surface-soft/30 p-3"
              key={activityLog.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-brand-strong">
                    {activityLog.activityNameSnapshot}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    {activityLog.activityDate?.toLocaleDateString() ?? "No date"}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <strong className="text-lg font-black text-brand-strong">
                    {activityLog.finalPoints}
                  </strong>
                  {isAdmin || activityLog.userId === currentUserId ? (
                    <button
                      className="rounded border border-danger/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      onClick={() => onDeleteActivityLog(activityLog)}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <section className="panel flex min-w-0 flex-col gap-4">
      <h2 className="break-words text-lg font-bold uppercase tracking-wider text-brand-strong">Teams</h2>
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
            className="flex min-w-0 items-center justify-between rounded-lg border border-line bg-surface-soft/30 p-4"
            key={team.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-4 w-4 flex-shrink-0 rounded-full shadow-sm"
                style={{ backgroundColor: team.color }}
              />
              <span className="min-w-0 truncate font-bold text-brand-strong">{team.name}</span>
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
    <section className="panel flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Invites</h2>
      {invite ? (
        <div className="rounded-lg border border-line bg-surface-soft/30 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            Challenge link
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
    <section className="panel flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-bold text-brand-strong uppercase tracking-wider">Members</h2>
      <div className="grid gap-2">
        {activeMembers.length === 0 ? (
          <p className="p-6 text-center text-muted italic bg-surface-soft rounded-lg">
            No members yet. Share an invite link to get started.
          </p>
        ) : null}
        {activeMembers.map((member) => (
          <div
            className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-line bg-surface-soft/30 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
            key={member.userId}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-strong text-white font-black">
                {member.displayNameSnapshot.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-brand-strong truncate">{member.displayNameSnapshot}</p>
              </div>
            </div>
            
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
              <label className="min-w-0 flex-1 !grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex-none">
                <span className="whitespace-nowrap">Team:</span>
                <select 
                  className="min-h-[38px] min-w-0 text-xs font-bold"
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

function CopyChallengePanel({
  activityRuleCount,
  isSaving,
  memberCount,
  onCopyChallenge,
  selectedChallenge,
}: {
  activityRuleCount: number;
  isSaving: boolean;
  memberCount: number;
  onCopyChallenge: (event: FormEvent<HTMLFormElement>) => void;
  selectedChallenge: Challenge | null;
}) {
  const currentYear = new Date().getFullYear();
  const defaultName = selectedChallenge
    ? `${selectedChallenge.name} ${currentYear + 1}`
    : "";
  const defaultDescription = selectedChallenge?.description ?? "";

  return (
    <section className="panel flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Next Challenge</p>
          <h2 className="text-lg font-bold uppercase tracking-wider text-brand-strong">
            Copy setup
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-auto">
          <Metric label="Members" value={String(memberCount)} />
          <Metric label="Activities" value={String(activityRuleCount)} />
        </div>
      </div>
      <p className="text-sm font-medium text-muted">
        Creates a new challenge with the same teams, active members, team assignments, and activities. Activity logs are not copied, so all points start at 0.
      </p>
      <form className="grid gap-4" onSubmit={onCopyChallenge}>
        <label>
          <span>New challenge name</span>
          <input
            defaultValue={defaultName}
            maxLength={80}
            name="copyChallengeName"
            required
          />
        </label>
        <label>
          <span>Description</span>
          <input
            defaultValue={defaultDescription}
            maxLength={240}
            name="copyChallengeDescription"
          />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span>Starts At</span>
            <input name="copyStartsAt" required type="date" />
          </label>
          <label>
            <span>Ends At</span>
            <input name="copyEndsAt" required type="date" />
          </label>
        </div>
        <button className="button-primary w-fit" disabled={isSaving} type="submit">
          {isSaving ? "Copying..." : "Copy challenge"}
        </button>
      </form>
    </section>
  );
}

function ActivityPanel({
  activityRules,
  isSaving,
  onCreateActivity,
  onDeleteActivity,
}: {
  activityRules: ActivityRule[];
  isSaving: boolean;
  onCreateActivity: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteActivity: (activityRule: ActivityRule) => void;
}) {
  return (
    <section className="panel flex min-w-0 flex-col gap-4">
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
        <label>
          <span>Points</span>
          <input
            max={50}
            min={1}
            name="activityPoints"
            type="number"
          />
        </label>
        <button
          className="button-primary"
          disabled={isSaving}
          type="submit"
        >
          Add activity
        </button>
      </form>

      <div className="mt-2 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-brand-strong truncate">{activityRule.name}</p>
                <p className="mt-1 text-xs font-extrabold text-muted uppercase tracking-wider">
                  {activityRule.scoring.points} pts
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="rounded-lg border border-danger/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() => onDeleteActivity(activityRule)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile min-w-0">
      <span>{label}</span>
      <strong className="break-words text-brand-strong uppercase">{value}</strong>
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
