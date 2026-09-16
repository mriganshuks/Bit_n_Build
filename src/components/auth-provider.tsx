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
import { onIdTokenChanged } from "firebase/auth";

export type AuthState = "LOADING" | "AUTHENTICATED" | "UNAUTHENTICATED" | "ERROR";

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
  authState: AuthState;
  firebaseUser: FirebaseUser | null;
  profile: AuthProfile | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType>({
  authState: "LOADING",
  firebaseUser: null,
  profile: null,
  loading: true,
  isConfigured: false,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [authState, setAuthState] = useState<AuthState>("LOADING");
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isFirebaseConfigured();
  const isMountedRef = useRef(true);
  const lastSyncedTokenRef = useRef<string | null>(null);
  const syncingPromiseRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      const auth = getClientAuth();
      if (auth?.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const syncSessionWithServer = useCallback(async (idToken: string) => {
    if (lastSyncedTokenRef.current === idToken && profile) {
      return { authenticated: true, profile };
    }
    if (syncingPromiseRef.current) {
      return await syncingPromiseRef.current;
    }

    const syncTask = (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ idToken }),
        });
        const data = await response.json();
        if (!isMountedRef.current) return data;

        if (response.ok && data.profile) {
          lastSyncedTokenRef.current = idToken;
          setProfile(data.profile);
          setAuthState("AUTHENTICATED");
        } else if (response.ok && data.isNewUser) {
          lastSyncedTokenRef.current = idToken;
          setProfile(null);
          setAuthState("AUTHENTICATED");
        } else {
          lastSyncedTokenRef.current = null;
          setProfile(null);
          setAuthState("UNAUTHENTICATED");
        }
        return data;
      } catch (err) {
        console.error("Failed to sync session with server:", err);
        lastSyncedTokenRef.current = null;
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Session sync failed");
          setAuthState("ERROR");
        }
        return null;
      } finally {
        syncingPromiseRef.current = null;
      }
    })();

    syncingPromiseRef.current = syncTask;
    return await syncTask;
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/auth/me", { headers });
      const data = await response.json();
      if (!isMountedRef.current) return;

      if (response.ok && data.profile) {
        setProfile(data.profile);
        setAuthState("AUTHENTICATED");
      } else if (response.ok && data.isNewUser) {
        setProfile(null);
        setAuthState("AUTHENTICATED");
      } else {
        setProfile(null);
        setAuthState(firebaseUser ? "AUTHENTICATED" : "UNAUTHENTICATED");
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to refresh profile");
      }
    }
  }, [getIdToken, firebaseUser]);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      // Firebase not configured: check local cookie profile (development/test)
      void fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (!isMountedRef.current) return;
          if (data?.profile) {
            setProfile(data.profile);
            setAuthState("AUTHENTICATED");
          } else {
            setAuthState("UNAUTHENTICATED");
          }
        })
        .catch(() => {
          if (isMountedRef.current) setAuthState("UNAUTHENTICATED");
        });
      return;
    }

    let isFirstNull = true;

    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (!isMountedRef.current) return;
      setFirebaseUser(user);
      setError(null);

      if (user) {
        isFirstNull = false;
        void user.getIdToken().then((idToken) => {
          void syncSessionWithServer(idToken);
        }).catch((err) => {
          console.error("Failed to get ID token:", err);
          if (isMountedRef.current) {
            setAuthState("ERROR");
            setError("Failed to obtain authentication token.");
          }
        });
      } else {
        // Logged out or initial unauthenticated state
        if (isFirstNull) {
          isFirstNull = false;
          // Check if there is an active local/dev cookie session
          void fetch("/api/auth/me")
            .then((res) => res.json())
            .then((data) => {
              if (!isMountedRef.current) return;
              if (data?.profile) {
                setProfile(data.profile);
                setAuthState("AUTHENTICATED");
              } else {
                setProfile(null);
                setAuthState("UNAUTHENTICATED");
              }
            })
            .catch(() => {
              if (isMountedRef.current) {
                setProfile(null);
                setAuthState("UNAUTHENTICATED");
              }
            });
        } else {
          setProfile(null);
          setAuthState("UNAUTHENTICATED");
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncSessionWithServer]);

  const signIn = async () => {
    setAuthState("LOADING");
    setError(null);
    try {
      const { user, idToken } = await firebaseGoogleSignIn();
      if (!isMountedRef.current) return;
      setFirebaseUser(user);
      const sessionResult = await syncSessionWithServer(idToken);
      if (sessionResult?.isNewUser) {
        router.push("/onboarding");
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Sign in failed");
        setAuthState("ERROR");
      }
      throw err;
    }
  };

  const signOut = async () => {
    setAuthState("LOADING");
    setError(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOutClient();
      if (!isMountedRef.current) return;
      lastSyncedTokenRef.current = null;
      setFirebaseUser(null);
      setProfile(null);
      setAuthState("UNAUTHENTICATED");
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Sign out failed");
        setAuthState("ERROR");
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        firebaseUser,
        profile,
        loading: authState === "LOADING",
        isConfigured,
        error,
        signIn,
        signOut,
        refreshProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
