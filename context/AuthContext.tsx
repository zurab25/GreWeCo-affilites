"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import { getFirebaseClients, isFirebaseConfigured } from "@/lib/firebase";
import { generateReferralId } from "@/lib/utils";

export type UserProfile = {
  referralId: string;
  displayName: string | null;
  createdAt?: unknown;
  role?: string;
  earnings?: { directBonus?: number };
  stats?: {
    clicks: number;
    conversions: number;
    earningsUsd: number;
  };
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    inviteCode: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUserProfile(
  d: DocumentData,
  fallbackName: string | null
): UserProfile {
  const stats = d.stats as UserProfile["stats"] | undefined;
  return {
    referralId: String(d.referralId ?? ""),
    displayName: (d.displayName as string | null) ?? fallbackName,
    createdAt: d.createdAt,
    role: d.role as string | undefined,
    earnings: d.earnings as UserProfile["earnings"],
    stats: stats
      ? {
          clicks: Number(stats.clicks) || 0,
          conversions: Number(stats.conversions) || 0,
          earningsUsd: Number(stats.earningsUsd) || 0,
        }
      : { clicks: 0, conversions: 0, earningsUsd: 0 },
  };
}

async function loadOrBootstrapUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null
): Promise<UserProfile | null> {
  const clients = getFirebaseClients();
  if (!clients) return null;

  const { db } = clients;
  const userRef = doc(db, "users", uid);
  let snap = await getDoc(userRef);

  if (!snap.exists()) {
    const legacyRef = doc(db, "affiliates", uid);
    const legacy = await getDoc(legacyRef);
    if (legacy.exists()) {
      const d = legacy.data() as DocumentData;
      await setDoc(userRef, {
        role: "affiliate",
        referralId: String(d.referralId ?? generateReferralId()),
        displayName: (d.displayName as string | null) ?? displayName,
        email: email ?? d.email,
        createdAt: d.createdAt ?? serverTimestamp(),
        earnings: { directBonus: 0 },
        stats:
          d.stats ?? { clicks: 0, conversions: 0, earningsUsd: 0 },
      });
      snap = await getDoc(userRef);
    }
  }

  if (!snap.exists()) {
    const referralId = generateReferralId();
    await setDoc(userRef, {
      role: "affiliate",
      referralId,
      displayName,
      email,
      createdAt: serverTimestamp(),
      earnings: { directBonus: 0 },
      stats: { clicks: 0, conversions: 0, earningsUsd: 0 },
    });
    snap = await getDoc(userRef);
  }

  if (!snap.exists()) return null;
  return mapUserProfile(snap.data(), displayName);
}

const INVITE_ERR = "Invalid or expired invite code";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(() => isFirebaseConfigured());
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      return;
    }
    const clients = getFirebaseClients();
    if (!clients) {
      return;
    }

    const unsub = onAuthStateChanged(clients.auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const p = await loadOrBootstrapUserProfile(
          nextUser.uid,
          nextUser.email,
          nextUser.displayName
        );
        setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [configured]);

  const refreshProfile = useCallback(async () => {
    const clients = getFirebaseClients();
    if (!user || !clients) return;
    const snap = await getDoc(doc(clients.db, "users", user.uid));
    if (snap.exists()) {
      setProfile(
        mapUserProfile(snap.data(), user.displayName)
      );
    }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const clients = getFirebaseClients();
    if (!clients) throw new Error("Firebase is not configured.");
    await signInWithEmailAndPassword(clients.auth, email, password);
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      inviteCode: string
    ) => {
      const clients = getFirebaseClients();
      if (!clients) throw new Error("Firebase is not configured.");

      const trimmed = inviteCode.trim();
      if (!trimmed) {
        throw new Error("Invite code is required.");
      }

      const inviteSnap = await getDocs(
        query(
          collection(clients.db, "invites"),
          where("id", "==", trimmed),
          limit(1)
        )
      );

      if (inviteSnap.empty) {
        throw new Error(INVITE_ERR);
      }

      const inviteDoc = inviteSnap.docs[0];
      const inv = inviteDoc.data() as { used?: boolean };
      if (inv.used === true) {
        throw new Error(INVITE_ERR);
      }

      let cred;
      try {
        cred = await createUserWithEmailAndPassword(
          clients.auth,
          email,
          password
        );
      } catch (e) {
        throw e instanceof Error ? e : new Error("Registration failed.");
      }

      const uid = cred.user.uid;
      const referralId = generateReferralId();

      const batch = writeBatch(clients.db);
      batch.set(doc(clients.db, "users", uid), {
        role: "affiliate",
        displayName,
        email: cred.user.email,
        referralId,
        createdAt: serverTimestamp(),
        earnings: { directBonus: 0 },
        stats: { clicks: 0, conversions: 0, earningsUsd: 0 },
      });
      batch.update(inviteDoc.ref, {
        used: true,
        usedBy: uid,
        usedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (e) {
        console.error(e);
        throw new Error(
          "Account created but invite could not be marked as used. Contact support with your email."
        );
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const clients = getFirebaseClients();
    if (!clients) return;
    await signOut(clients.auth);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured,
      signIn,
      signUp,
      logout,
      refreshProfile,
    }),
    [
      configured,
      loading,
      logout,
      profile,
      signIn,
      signUp,
      user,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
