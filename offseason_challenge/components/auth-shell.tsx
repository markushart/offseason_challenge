"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { auth, hasFirebaseConfig } from "@/lib/firebase";

type AuthShellProps = {
  children: ReactNode;
};

const getAuthMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Google sign-up failed. Please try again.";
};

export function AuthShell({ children }: AuthShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(auth));
  const [isSigningIn, setIsSigningIn] = useState(false);
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
      <main className="min-h-screen bg-stone-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
        <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Offseason Challenge
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">
              Sign up to join your team competition.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600">
              Create your account with Google, then track trainings, runs, gym
              sessions, proof uploads, and team standings from one dashboard.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Google sign-up creates a Firebase Auth user for this app. Team
              membership and activity logs will be connected to that user ID.
            </p>

            <button
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-zinc-300 bg-white px-4 font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasFirebaseConfig || isSigningIn}
              onClick={handleGoogleSignUp}
              type="button"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-base font-semibold">
                G
              </span>
              {isSigningIn ? "Opening Google..." : "Sign up with Google"}
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
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-3 text-zinc-950 sm:px-6 lg:px-8">
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
            className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold transition hover:bg-zinc-50"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </>
  );
}
