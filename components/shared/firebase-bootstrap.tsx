"use client";

import { useEffect, type ReactNode } from "react";

import { getFirebaseClients } from "@/lib/firebase";

/**
 * Initializes Firebase SDKs (Auth, Firestore, Analytics) once on the client.
 */
export function FirebaseBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    getFirebaseClients();
  }, []);

  return <>{children}</>;
}
