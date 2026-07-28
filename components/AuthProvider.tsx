"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyAuthState } from "@/lib/auth-state";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  isTeacher: boolean;
  demoMode: boolean;
  signInTeacher: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setReady(true);
      return;
    }
    const auth = getClientAuth();
    return onAuthStateChanged(auth, (nextUser) => {
      void applyAuthState(nextUser, {
        setReady,
        setUser,
        signInGuest: () => signInAnonymously(auth),
      }).catch(() => setReady(true));
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    demoMode: !isFirebaseConfigured,
    isTeacher: !isFirebaseConfigured || Boolean(user && !user.isAnonymous),
    signInTeacher: async () => {
      if (!isFirebaseConfigured) return;
      await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
    },
    signOutUser: async () => {
      if (!isFirebaseConfigured) return;
      setReady(false);
      await signOut(getClientAuth());
    },
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
