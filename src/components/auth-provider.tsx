"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getClientAuth,
  signInWithGoogle as firebaseGoogleSignIn,
  signOutClient,
  isFirebaseConfigured,
  type FirebaseUser,
} from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export type AuthProfile = {
  id: string;
  displayName: string;
  email: string;
  handle: string;
  headline?: string;
  photoUrl?: string;
  skills: Array<{ name: string; status: string; assessmentScore?: number }>;
};

type AuthContextType = {
  firebaseUser: FirebaseUser | null;
  profile: AuthProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  profile: null,
  loading: true,
  isConfigured: false,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();
  const initialCheckRef = useRef(false);

  const syncSessionWithServer = useCallback(async (idToken: string) => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (response.ok && data.profile) {
        setProfile(data.profile);
      } else {
        setProfile(null);
      }
      return data;
    } catch (err) {
      console.error("Failed to sync session with server:", err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (response.ok && data.profile) {
        setProfile(data.profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }, []);

  useEffect(() => {
    if (initialCheckRef.current) return;
    initialCheckRef.current = true;

    const auth = getClientAuth();
    if (!auth) {
      // Firebase not configured or server-side: check local profile
      void fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data?.profile) setProfile(data.profile);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        void user.getIdToken().then((idToken) => {
          void syncSessionWithServer(idToken).finally(() => setLoading(false));
        });
      } else {
        void refreshProfile().finally(() => setLoading(false));
      }
    });

    return () => unsubscribe();
  }, [refreshProfile, syncSessionWithServer]);

  const signIn = async () => {
    setLoading(true);
    try {
      const { user, idToken } = await firebaseGoogleSignIn();
      setFirebaseUser(user);
      const sessionResult = await syncSessionWithServer(idToken);
      if (sessionResult?.isNewUser) {
        router.push("/onboarding");
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOutClient();
      setFirebaseUser(null);
      setProfile(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isConfigured,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
