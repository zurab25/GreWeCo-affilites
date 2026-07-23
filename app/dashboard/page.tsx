"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, DollarSign, MousePointerClick } from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardOverviewPage() {
  const { profile, user } = useAuth();
  const stats = profile?.stats ?? {
    clicks: 0,
    conversions: 0,
    earningsUsd: 0,
  };

  return (
    <div className="relative z-[1] mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Welcome back
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {profile?.displayName ?? user?.displayName ?? "Partner"}{" "}
          <span className="text-zinc-500">·</span>{" "}
          <span className="text-zinc-400">GreWeCo command</span>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
          Real-time performance for your arena.grew.eco referrals. Stats sync from Firestore as your
          integration lands traffic and conversion events.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Referral clicks"
          value={stats.clicks.toLocaleString()}
          delta="Attributed link taps"
          icon={MousePointerClick}
        />
        <StatCard
          label="Conversions"
          value={stats.conversions.toLocaleString()}
          delta="Qualified actions"
          icon={Eye}
        />
        <StatCard
          label="Est. earnings"
          value={formatUsd(stats.earningsUsd)}
          delta="USD · settlement cycle TBD"
          icon={DollarSign}
        />
        <StatCard
          label="Referral ID"
          value={profile?.referralId ?? "—"}
          delta="Embedded in Arena & grew.eco attribution links"
          icon={ArrowUpRight}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>
              Ship your first tracked link, share assets from Resources, and climb the leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/links"
              className={buttonVariants("primary", "flex-1 text-center")}
            >
              Open link studio
            </Link>
            <Link
              href="/dashboard/resources"
              className={buttonVariants("secondary", "flex-1 text-center")}
            >
              Browse assets
            </Link>
          </CardContent>
        </Card>
        <Card className="border-violet-500/15 bg-gradient-to-br from-violet-600/10 to-transparent">
          <CardHeader>
            <CardTitle className="text-base">Compliance</CardTitle>
            <CardDescription>
              Always disclose affiliate relationships and follow grew.eco brand guidelines in your
              territory.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
