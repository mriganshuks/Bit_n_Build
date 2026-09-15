import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, type Auth, type User as FirebaseUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

export function getClientFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    const existing = getApps();
    app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getClientAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (!authInstance) {
    const initializedApp = getClientFirebaseApp();
    if (initializedApp) {
      authInstance = getAuth(initializedApp);
    }
  }
  return authInstance;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: "select_account" });
  }
  return googleProviderInstance;
}

export async function signInWithGoogle(): Promise<{ user: FirebaseUser; idToken: string }> {
  const auth = getClientAuth();
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Please add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID to your environment."
    );
  }
  const provider = getGoogleProvider();
  const credential = await signInWithPopup(auth, provider);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signOutClient(): Promise<void> {
  const auth = getClientAuth();
  if (auth) {
    await firebaseSignOut(auth);
  }
}

export type { FirebaseUser };
