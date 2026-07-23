"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Hexagon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { AFFILIATES_APP_HOST } from "@/lib/branding";

export default function LoginPage() {
  const { user, loading, configured, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && configured && user) {
      router.replace("/dashboard");
    }
  }, [configured, loading, router, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
        <p className="text-sm">Checking session…</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <Card className="w-full max-w-md border-cyan-500/20">
        <CardHeader>
          <CardTitle>Configure Firebase</CardTitle>
          <CardDescription>
            Copy <code className="text-cyan-300/90">.env.local.example</code> to{" "}
            <code className="text-cyan-300/90">.env.local</code> and add your project keys from the
            Firebase console. Restart <code className="text-cyan-300/90">npm run dev</code> after
            saving.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-cyan-500/15 shadow-[0_0_60px_-20px_rgba(34,211,238,0.35)]">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-300">
          <Hexagon className="h-6 w-6" aria-hidden />
        </div>
        <CardTitle className="text-xl">GreWeCo Affiliates</CardTitle>
        <CardDescription>
          Sign in to manage links, analytics, and payouts for{" "}
          <span className="font-mono text-zinc-400">{AFFILIATES_APP_HOST}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          New partner?{" "}
          <Link
            href="/register"
            className="font-medium text-cyan-400/90 underline-offset-4 hover:text-cyan-300 hover:underline"
          >
            Create an affiliate account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
