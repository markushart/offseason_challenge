"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, hasFirebaseConfig } from "@/lib/firebase";

type AuthShellProps = {
  children: ReactNode;
};

const getAuthMessage = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message.includes("auth/email-already-in-use")) {
      return "An account already exists for this email. Sign in instead.";
    }

    if (error.message.includes("auth/invalid-credential")) {
      return "Email or password is incorrect.";
    }

    if (error.message.includes("auth/weak-password")) {
      return "Use a password with at least 6 characters.";
    }

    if (error.message.includes("auth/operation-not-allowed")) {
      return "Email/password sign-in is not enabled for this Firebase project.";
    }

    return error.message;
  }

  return "Sign-in failed. Please try again.";
};

const SignedInUserContext = createContext<User | null>(null);

export function useSignedInUser() {
  const user = useContext(SignedInUserContext);

  if (!user) {
    throw new Error("useSignedInUser must be used below AuthShell.");
  }

  return user;
}

export function AuthShell({ children }: AuthShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(auth));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authMode, setAuthMode] = useState<"signIn" | "create">("signIn");
  const [error, setError] = useState<string | null>(null);

  const googleProvider = useMemo(() => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
  }, []);

  const handleGoogleSignUp = async () => {
    if (!auth) {
      setError("Firebase is not configured yet. Add your values to .env.local.");
      return;
    }

    setError(null);
    setIsSigningIn(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (signInError) {
      setError(getAuthMessage(signInError));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auth) {
      setError("Firebase is not configured yet. Add your values to .env.local.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!email || !password) {
      setError("Add an email and password.");
      return;
    }

    if (authMode === "create" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsSigningIn(true);

    try {
      if (authMode === "create") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (signInError) {
      setError(getAuthMessage(signInError));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-zinc-950">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm font-medium shadow-sm">
          Loading account state...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-stone-50 px-3 py-4 text-zinc-950 sm:px-6 sm:py-6 lg:px-8">
        <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:text-sm">
              Offseason Challenge
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
              Sign up for your team challenge.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
              Create your account, then manage trainings, activities,
              proof uploads, and team standings from your phone.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-xl font-semibold">Enter the challenge</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Sign in with Google or use your email and password. Team
              membership and activity logs connect to your Firebase user ID.
            </p>

            <div className="mt-5 grid grid-cols-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              <button
                className={`h-10 rounded-md text-sm font-semibold transition ${
                  authMode === "signIn"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
                onClick={() => {
                  setAuthMode("signIn");
                  setError(null);
                }}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`h-10 rounded-md text-sm font-semibold transition ${
                  authMode === "create"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
                onClick={() => {
                  setAuthMode("create");
                  setError(null);
                }}
                type="button"
              >
                Create account
              </button>
            </div>

            <form className="mt-5 grid gap-3" onSubmit={handleEmailAuth}>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-zinc-700">Email</span>
                <input
                  autoComplete="email"
                  className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-600"
                  name="email"
                  placeholder="test-participant@example.com"
                  required
                  type="email"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-zinc-700">Password</span>
                <input
                  autoComplete={authMode === "create" ? "new-password" : "current-password"}
                  className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-600"
                  minLength={6}
                  name="password"
                  required
                  type="password"
                />
              </label>
              {authMode === "create" ? (
                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-zinc-700">Confirm password</span>
                  <input
                    autoComplete="new-password"
                    className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-600"
                    minLength={6}
                    name="confirmPassword"
                    required
                    type="password"
                  />
                </label>
              ) : null}
              <button
                className="flex h-12 w-full items-center justify-center rounded-md bg-emerald-700 px-4 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!hasFirebaseConfig || isSigningIn}
                type="submit"
              >
                {isSigningIn
                  ? "Working..."
                  : authMode === "create"
                    ? "Create account"
                    : "Sign in with email"}
              </button>
            </form>

            <button
              className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-zinc-300 bg-white px-4 font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasFirebaseConfig || isSigningIn}
              onClick={handleGoogleSignUp}
              type="button"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-base font-semibold">
                G
              </span>
              {isSigningIn ? "Opening Google..." : "Continue with Google"}
            </button>

            {!hasFirebaseConfig ? (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Firebase config is missing. Copy .env.example to .env.local and
                fill in the web app values from Firebase Console.
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <SignedInUserContext.Provider value={user}>
      <header className="border-b border-zinc-200 bg-white px-3 py-3 text-zinc-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800">
              {(user.displayName ?? user.email ?? "U").slice(0, 1)}
            </div>
            <div>
              <p className="text-sm text-zinc-500">Signed in as</p>
              <p className="font-semibold">{user.displayName ?? user.email}</p>
            </div>
          </div>
          <button
            className="h-11 w-full rounded-md border border-zinc-300 px-4 text-sm font-semibold transition hover:bg-zinc-50 sm:h-10 sm:w-auto"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </SignedInUserContext.Provider>
  );
}
