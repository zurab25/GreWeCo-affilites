"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Clock, CheckCircle, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseClients } from "@/lib/firebase";
import {
  fetchAffiliateCommissions,
  computeEarningsSummary,
  COMMISSION_TYPE_LABELS,
  COMMISSION_STATUS_LABELS,
  type Commission,
  type EarningsSummary,
} from "@/lib/commissions";
import { cn } from "@/lib/utils";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CommissionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg bg-white/5"
        />
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  approved: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  paid: "border-green-500/40 bg-green-500/10 text-green-200",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-200",
};

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);

  const loadCommissions = useCallback(async () => {
    if (!uid) return;
    const clients = getFirebaseClients();
    if (!clients) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAffiliateCommissions(clients.db, uid);
      setCommissions(data);
      setSummary(computeEarningsSummary(data));
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to load commissions."
      );
      setCommissions([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    queueMicrotask(() => {
      void loadCommissions();
    });
  }, [uid, loadCommissions]);

  return (
    <div className="relative z-[1] mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Commissions
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Earnings & Payouts
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Track your commission earnings from referrals. First unit sales earn 10%.
          Future carbon-credit proceeds (10%) and timber proceeds (5%) are recorded
          but computed after 8 years.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending"
          value={
            loading || authLoading
              ? "—"
              : formatUsd(summary?.totalPending ?? 0)
          }
          delta="Awaiting payout"
          icon={Clock}
        />
        <StatCard
          label="Paid Out"
          value={
            loading || authLoading
              ? "—"
              : formatUsd(summary?.totalPaid ?? 0)
          }
          delta="All time"
          icon={CheckCircle}
        />
        <StatCard
          label="First-Sale Pending"
          value={
            loading || authLoading
              ? "—"
              : formatUsd(summary?.pendingByType.first_sale ?? 0)
          }
          delta="10% of unit price"
          icon={DollarSign}
        />
        <StatCard
          label="Total Commissions"
          value={
            loading || authLoading
              ? "—"
              : String(summary?.commissionCount ?? 0)
          }
          delta="Qualifying transactions"
          icon={Wallet}
        />
      </div>

      <Card className="border-white/10">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Commission Ledger</CardTitle>
            <CardDescription>
              All commissions from your referrals. Payouts are processed manually
              and shown as &quot;Pending&quot; until settled.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => void loadCommissions()}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            Refresh
          </button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}

          {loading || authLoading ? (
            <CommissionsSkeleton />
          ) : commissions.length === 0 ? (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
              <p className="text-sm text-zinc-500">
                No commissions yet. Share your referral link and earn 10% on
                first unit sales from your referrals.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {commissions.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          STATUS_COLORS[c.status] ?? STATUS_COLORS.pending
                        )}
                      >
                        {COMMISSION_STATUS_LABELS[c.status]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {COMMISSION_TYPE_LABELS[c.commissionType]}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {formatDate(c.createdAt)}
                      {c.orderId && (
                        <>
                          {" · Order "}
                          <code className="text-zinc-400">
                            {c.orderId.slice(0, 8)}…
                          </code>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-mono text-sm font-semibold tabular-nums text-cyan-300">
                      {formatUsd(c.commissionAmountUsd)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      from {formatUsd(c.orderAmountUsd)} order
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-violet-500/15 bg-gradient-to-br from-violet-600/10 to-transparent">
        <CardHeader>
          <CardTitle className="text-base">Commission Terms</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            <strong>First-sale commission:</strong> 10% of the unit sale price,
            computed immediately when an attributed order is placed.
            <br />
            <strong>Carbon-credit proceeds:</strong> 10% of GreWeCo&apos;s share,
            credited when carbon credits are sold (typically year 8+).
            <br />
            <strong>Timber proceeds:</strong> 5% of GreWeCo&apos;s share,
            credited when timber is harvested and sold (year 8+).
            <br />
            <br />
            All payouts are processed manually and appear as &quot;Pending&quot;
            until settled. Contact{" "}
            <a
              href="mailto:contact@grew.eco"
              className="text-cyan-400 underline-offset-2 hover:underline"
            >
              contact@grew.eco
            </a>{" "}
            for payout inquiries.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
