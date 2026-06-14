"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSignedInUser } from "@/components/auth-shell";
import { listenMemberChallenges, type Challenge } from "@/lib/challenges";

type DashboardShellProps = {
  children: (props: {
    selectedChallengeId: string;
    setSelectedChallengeId: (id: string) => void;
  }) => ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const user = useSignedInUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastActiveChallengeId") ?? "";
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(true);

  // Update localStorage when selection changes
  useEffect(() => {
    if (selectedChallengeId) {
      localStorage.setItem("lastActiveChallengeId", selectedChallengeId);
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
    <div className="flex min-h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-zinc-200 bg-white lg:static lg:block hidden">
        <div className="flex h-full flex-col">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-lg font-bold text-emerald-800">Offseason</h2>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <button
                onClick={() => handleSelectChallenge("")}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition ${
                  selectedChallengeId === ""
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                + New Challenge
              </button>
            </div>

            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Your Challenges
              </p>
              {isLoading ? (
                <p className="px-3 py-2 text-sm text-zinc-400">Loading...</p>
              ) : challenges.length === 0 ? (
                <p className="px-3 py-2 text-sm text-zinc-400 italic">No challenges yet</p>
              ) : (
                challenges.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => handleSelectChallenge(challenge.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium truncate transition ${
                      selectedChallengeId === challenge.id
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {challenge.name}
                  </button>
                ))
              )}
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Simplified) */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-200 bg-white">
          <h2 className="text-lg font-bold text-emerald-800">Offseason</h2>
          <select 
            value={selectedChallengeId} 
            onChange={(e) => handleSelectChallenge(e.target.value)}
            className="text-sm border-zinc-200 rounded-md"
          >
            <option value="">+ New Challenge</option>
            {challenges.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </header>

        <main className="flex-1">
          {children({ selectedChallengeId, setSelectedChallengeId })}
        </main>
      </div>
    </div>
  );
}
