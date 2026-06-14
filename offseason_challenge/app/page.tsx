import { AuthShell } from "@/components/auth-shell";
import { ChallengeAdmin } from "@/components/challenge-admin";

export default function Home() {
  return (
    <AuthShell>
      <ChallengeAdmin />
    </AuthShell>
  );
}
