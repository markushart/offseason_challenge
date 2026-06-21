import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
];

export const hasFirebaseConfig = requiredConfig.every(Boolean);

export const app: FirebaseApp | null = hasFirebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

type EmulatorWindow = Window & {
  __OFFSEASON_AUTH_EMULATOR_CONNECTED__?: boolean;
  __OFFSEASON_FIRESTORE_EMULATOR_CONNECTED__?: boolean;
};

if (
  auth &&
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
) {
  const emulatorWindow = window as EmulatorWindow;

  if (!emulatorWindow.__OFFSEASON_AUTH_EMULATOR_CONNECTED__) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    emulatorWindow.__OFFSEASON_AUTH_EMULATOR_CONNECTED__ = true;
  }

  if (db && !emulatorWindow.__OFFSEASON_FIRESTORE_EMULATOR_CONNECTED__) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    emulatorWindow.__OFFSEASON_FIRESTORE_EMULATOR_CONNECTED__ = true;
  }
}
