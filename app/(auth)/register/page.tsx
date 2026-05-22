"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Hexagon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { user, loading, configured, signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      await signUp(email, password, displayName, inviteCode);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
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
            Add your Firebase keys to <code className="text-cyan-300/90">.env.local</code> before
            registering. See <code className="text-cyan-300/90">.env.local.example</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-violet-500/15 shadow-[0_0_60px_-20px_rgba(168,85,247,0.35)]">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/10 text-violet-300">
          <Hexagon className="h-6 w-6" aria-hidden />
        </div>
        <CardTitle className="text-xl">Join GreWeCo Affiliates</CardTitle>
        <CardDescription>
          Invite-only access. You will use your UID-based arena links and appear on the partner
          leaderboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            name="inviteCode"
            label="Invite code"
            autoComplete="off"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            hint="Provided by your GreWeCo partner manager."
          />
          <Input
            name="displayName"
            label="Display name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            hint="Shown on the leaderboard and partner comms."
          />
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
            autoComplete="new-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            hint="Min. 6 characters (Firebase default)."
          />
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-cyan-400/90 underline-offset-4 hover:text-cyan-300 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
