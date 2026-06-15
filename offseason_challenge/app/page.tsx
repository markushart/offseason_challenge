"use client";

import { AuthShell } from "@/components/auth-shell";
import { ChallengeAdmin } from "@/components/challenge-admin";
import { DashboardShell } from "@/components/dashboard-shell";

export default function Home() {
  return (
    <AuthShell>
      <DashboardShell>
        {({ selectedChallengeId, setSelectedChallengeId }) => (
          <ChallengeAdmin 
            selectedChallengeId={selectedChallengeId} 
            onChallengeCreated={setSelectedChallengeId} 
            onChallengeDeleted={() => setSelectedChallengeId("")}
          />
        )}
      </DashboardShell>
    </AuthShell>
  );
}
