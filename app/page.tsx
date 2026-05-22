"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured) {
      router.replace("/login");
      return;
    }
    if (!loading) {
      if (user) router.replace("/dashboard");
      else router.replace("/login");
    }
  }, [configured, loading, router, user]);

  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center gap-3">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400"
        aria-hidden
      />
      <p className="text-sm text-zinc-500">Entering GreWeCo Affiliates…</p>
    </div>
  );
}
