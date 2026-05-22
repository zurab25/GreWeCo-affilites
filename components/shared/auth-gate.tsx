"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050508] px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
      <p className="mt-4 text-sm text-zinc-500">Loading workspace…</p>
    </div>
  );
}

function FirebaseSetup() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050508] px-6 text-center">
      <p className="text-sm font-medium text-white">Firebase is not configured</p>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
        Copy <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300/90">.env.local.example</code>{" "}
        to <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300/90">.env.local</code> and add
        your GreWeCo Firebase project keys. Restart the dev server after saving.
      </p>
    </div>
  );
}

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login");
    }
  }, [configured, loading, router, user]);

  if (!configured) return <FirebaseSetup />;
  if (loading) return <PageLoader />;
  if (!user) return <PageLoader />;

  return <>{children}</>;
}
