"use client";

import { useCallback, useEffect, useState } from "react";
import { Medal } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchAffiliateLeaderboard } from "@/lib/leaderboard-data";
import { getFirebaseClients } from "@/lib/firebase";
import { cn } from "@/lib/utils";

function LeaderboardSkeleton() {
  return (
    <ul className="divide-y divide-white/5">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-2 w-24 animate-pulse rounded bg-white/5" />
            </div>
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
        </li>
      ))}
    </ul>
  );
}

function formatBonus(idx: number): string | null {
  if (idx === 0) return "+5% Monthly Bonus";
  if (idx === 1) return "+3% Monthly Bonus";
  if (idx === 2) return "+2% Monthly Bonus";
  return null;
}

function formatVolume(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const ACCENTS = [
  "from-cyan-500/40",
  "from-violet-500/40",
  "from-fuchsia-500/35",
  "from-cyan-500/25",
  "from-violet-500/25",
];

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchAffiliateLeaderboard>>
  >([]);

  const load = useCallback(async () => {
    const clients = getFirebaseClients();
    if (!clients) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAffiliateLeaderboard(clients.db);
      setRows(data);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Could not load leaderboard."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <div className="relative z-[1] mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Standings
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Partner leaderboard</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Live rankings from Firestore <code className="text-zinc-600">users</code> where{" "}
          <code className="text-zinc-600">role == &quot;affiliate&quot;</code>, sorted by{" "}
          <code className="text-zinc-600">earnings.directBonus</code> (monthly direct sales
          volume).
        </p>
      </div>

      <Card className="overflow-hidden border-white/10">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200">
              <Medal className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Top affiliates</CardTitle>
              <CardDescription>
                Higher direct bonus volume ranks you toward seasonal co-marketing unlocks.
              </CardDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            Refresh
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="border-b border-red-500/20 bg-red-500/5 px-5 py-3 text-xs text-red-200">
              {error}
            </p>
          ) : null}
          {loading ? (
            <LeaderboardSkeleton />
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              No affiliate profiles found. Ensure users have{" "}
              <code className="text-zinc-400">role: &quot;affiliate&quot;</code> and{" "}
              <code className="text-zinc-400">earnings.directBonus</code> in Firestore.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {rows.map((row, index) => {
                const rank = index + 1;
                const bonus = formatBonus(index);
                const accent = ACCENTS[index % ACCENTS.length]!;
                return (
                  <li
                    key={row.uid}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white",
                          accent,
                          "to-zinc-900/40 ring-1 ring-white/10"
                        )}
                      >
                        {rank}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{row.displayName}</p>
                        <p className="text-xs text-zinc-500">GreWeCo affiliate</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-col sm:items-end md:flex-row">
                      {bonus ? (
                        <span
                          className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                        >
                          {bonus}
                        </span>
                      ) : null}
                      <p className="text-sm tabular-nums text-cyan-300/90">
                        {formatVolume(row.directBonus)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
