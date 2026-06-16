"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSignedInUser } from "@/components/auth-shell";
import { listenMemberChallenges, joinChallenge, type Challenge } from "@/lib/challenges";

type DashboardShellProps = {
  children: (props: {
    selectedChallengeId: string;
    setSelectedChallengeId: (id: string) => void;
  }) => ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const user = useSignedInUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(window.location.search).get("join");
  });
  const [isJoining, setIsJoining] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage?.getItem?.("lastActiveChallengeId") ?? "";
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(true);

  const clearJoinParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState({}, "", url.pathname);
  };

  const handleJoinChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingJoinCode) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!displayName) {
      setJoinError("Add your name to join this challenge.");
      return;
    }

    setJoinError(null);
    setIsJoining(true);

    try {
      const id = await joinChallenge(user, pendingJoinCode, displayName);
      setSelectedChallengeId(id);
      setPendingJoinCode(null);
      clearJoinParam();
    } catch (err) {
      console.error("Failed to join challenge:", err);
      setJoinError(err instanceof Error ? err.message : "Failed to join challenge.");
    } finally {
      setIsJoining(false);
    }
  };

  // Update localStorage when selection changes
  useEffect(() => {
    if (selectedChallengeId) {
      window.localStorage?.setItem?.("lastActiveChallengeId", selectedChallengeId);
    }
  }, [selectedChallengeId]);

  useEffect(() => {
    return listenMemberChallenges(
      user.uid,
      (nextChallenges) => {
        setChallenges(nextChallenges);
        setIsLoading(false);

        // If no challenge is selected yet, or the selected one isn't in the list, 
        // default to the first one (most recent / alphabetical)
        setSelectedChallengeId((currentId) => {
          if (currentId && nextChallenges.some((c) => c.id === currentId)) {
            return currentId;
          }
          return nextChallenges[0]?.id ?? "";
        });
      },
      (error) => {
        console.error("Error listening to challenges:", error);
        setIsLoading(false);
      }
    );
  }, [user.uid]);

  const handleSelectChallenge = (id: string) => {
    setSelectedChallengeId(id);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Matching Laufchallenge aesthetics */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-line bg-surface lg:static lg:block hidden shadow-sm">
        <div className="flex h-full flex-col">
          <div className="p-6 border-b border-line bg-surface">
            <p className="eyebrow">Offseason</p>
            <h2 className="text-xl font-bold text-brand">Challenge</h2>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <button
                onClick={() => handleSelectChallenge("")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-extrabold transition ${
                  selectedChallengeId === ""
                    ? "bg-brand text-white"
                    : "text-muted hover:bg-surface-soft"
                }`}
              >
                + New Challenge
              </button>
            </div>

            <div className="space-y-1">
              <p className="px-3 text-[11px] font-extrabold uppercase tracking-widest text-muted opacity-60">
                Your Challenges
              </p>
              {isLoading ? (
                <p className="px-3 py-2 text-sm text-muted">Loading...</p>
              ) : challenges.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted italic opacity-60">No challenges yet</p>
              ) : (
                challenges.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => handleSelectChallenge(challenge.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-extrabold truncate transition ${
                      selectedChallengeId === challenge.id
                        ? "bg-brand text-white shadow-md"
                        : "text-muted hover:bg-surface-soft"
                    }`}
                  >
                    {challenge.name}
                  </button>
                ))
              )}
            </div>
          </nav>
          
          <div className="p-4 border-t border-line">
             <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white font-extrabold text-lg">
                  {(user.displayName ?? user.email ?? "U").slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase text-muted leading-none mb-1">Signed in</p>
                  <p className="font-extrabold text-sm truncate text-brand-strong">{user.displayName ?? user.email}</p>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-line bg-surface shadow-sm">
           <div>
            <p className="eyebrow leading-none mb-1">Offseason</p>
            <h2 className="text-lg font-bold text-brand">Challenge</h2>
          </div>
          <select 
            value={selectedChallengeId} 
            onChange={(e) => handleSelectChallenge(e.target.value)}
            className="text-sm font-extrabold border-line rounded-lg w-auto min-h-[38px] bg-surface-soft"
          >
            <option value="">+ New Challenge</option>
            {challenges.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {pendingJoinCode ? (
            <form
              className="mb-4 rounded-lg border border-line bg-surface p-4 shadow-sm"
              onSubmit={handleJoinChallenge}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label>
                  <span>Your name</span>
                  <input
                    autoFocus
                    defaultValue={user.displayName ?? ""}
                    maxLength={80}
                    name="displayName"
                    placeholder="Name shown in this challenge"
                    required
                  />
                </label>
                <button
                  className="button-primary"
                  disabled={isJoining}
                  type="submit"
                >
                  {isJoining ? "Joining..." : "Join challenge"}
                </button>
              </div>
            </form>
          ) : null}
          {joinError ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {joinError}
            </p>
          ) : null}
          {children({ selectedChallengeId, setSelectedChallengeId })}
        </main>
      </div>
    </div>
  );
}
