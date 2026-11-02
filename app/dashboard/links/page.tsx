"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Fingerprint,
  LineChart,
  RadioTower,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { buildArenaJoinUrl } from "@/lib/arena";
import { ARENA_JOIN_PATH_LABEL } from "@/lib/branding";
import { fetchClicksAnalyticsGrouped } from "@/lib/clicks-analytics";
import { resolveAffiliateReferralCode } from "@/lib/referral";
import {
  ARENA_PLATFORM_KEYS,
  ARENA_PLATFORM_LABELS,
  type ArenaPlatformKey,
} from "@/lib/platforms";
import { getFirebaseClients } from "@/lib/firebase";
import { cn } from "@/lib/utils";

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-lg bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-lg bg-white/5" />
        <div className="h-20 animate-pulse rounded-lg bg-white/5" />
      </div>
    </div>
  );
}

function MiniSparkline() {
  return (
    <svg viewBox="0 0 100 50" className="h-28 w-full text-cyan-400/80" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points="0,38 10,34 20,30 30,28 40,22 50,24 60,16 70,18 80,12 90,10 100,6"
      />
    </svg>
  );
}

type MetricsBlockProps = {
  clicks: number;
  conversions: number;
};

function MetricsBlock({ clicks, conversions }: MetricsBlockProps) {
  const rate =
    clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0;
  return (
    <div className="space-y-4">
      <MiniSparkline />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-cyan-500/20 bg-black/30 px-3 py-2 text-xs">
          <p className="text-zinc-500">Total clicks</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-white">
            {clicks.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-violet-500/20 bg-black/30 px-3 py-2 text-xs">
          <p className="text-zinc-500">Conversions</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-white">
            {conversions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs">
          <p className="text-zinc-500">Conv. rate</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-white">
            {rate}%
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLinksPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const referralCode = resolveAffiliateReferralCode(profile, user);

  const [platform, setPlatform] = useState<ArenaPlatformKey>("instagram");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [byPlatform, setByPlatform] = useState<
    Awaited<ReturnType<typeof fetchClicksAnalyticsGrouped>>["byPlatform"] | null
  >(null);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalConversions, setTotalConversions] = useState(0);

  const refreshAnalytics = useCallback(async () => {
    if (!uid) return;
    const clients = getFirebaseClients();
    if (!clients) {
      setAnalyticsLoading(false);
      return;
    }
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const result = await fetchClicksAnalyticsGrouped(clients.db, uid);
      setByPlatform(result.byPlatform);
      setTotalClicks(result.totalClicks);
      setTotalConversions(result.totalConversions);
    } catch (e) {
      console.error(e);
      setAnalyticsError(
        e instanceof Error ? e.message : "Failed to load analytics."
      );
      setByPlatform(null);
      setTotalClicks(0);
      setTotalConversions(0);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    queueMicrotask(() => {
      void refreshAnalytics();
    });
  }, [uid, refreshAnalytics]);

  function generateLink() {
    if (!referralCode) return;
    setGeneratedUrl(buildArenaJoinUrl(referralCode, platform));
  }

  async function copyToClipboard(text: string, which: "link" | "code") {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (which === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1600);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1600);
      }
    } catch {
      if (which === "link") setCopiedLink(false);
      else setCopiedCode(false);
    }
  }

  return (
    <div className="relative z-[1] mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Arena attribution
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Links & analytics</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Share your standalone referral code or per-channel Arena join URLs. The same code powers{" "}
          <code className="font-mono text-zinc-400">aff=</code> on every generated link. Analytics
          pull from <code className="text-zinc-400">clicks_analytics</code> for your affiliate ID.
        </p>
      </div>

      <Card className="neon-border-cyan border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fingerprint className="h-5 w-5 text-cyan-300" aria-hidden />
            Your referral code
          </CardTitle>
          <CardDescription>
            New users can enter this code manually during signup on arena.grew.eco. It is also
            embedded as <code className="font-mono text-zinc-500">ref</code> in your tracked links
            below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            readOnly
            label="Referral code"
            className="font-mono text-base font-semibold tracking-widest text-cyan-100 sm:flex-1"
            value={
              authLoading
                ? "Loading…"
                : referralCode || "No code available — complete registration."
            }
          />
          <Button
            type="button"
            disabled={!referralCode}
            onClick={() => void copyToClipboard(referralCode, "code")}
            className="w-full shrink-0 gap-2 sm:w-auto"
          >
            {copiedCode ? (
              <>
                <Check className="h-4 w-4" /> Copied code
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-cyan-500/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RadioTower className="h-4 w-4 text-cyan-300" aria-hidden />
            Multi-channel link generator
          </CardTitle>
          <CardDescription>
            Generates{" "}
            <code className="font-mono text-zinc-400">
              {ARENA_JOIN_PATH_LABEL}?aff=YOUR_CODE&source=…
            </code>{" "}
            using the referral code above.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Platform
            </span>
            <div className="flex flex-wrap gap-2">
              {ARENA_PLATFORM_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlatform(key)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition",
                    platform === key
                      ? "border-cyan-500/40 bg-cyan-500/15 text-white shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                      : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  )}
                >
                  {ARENA_PLATFORM_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            onClick={generateLink}
            disabled={authLoading || !referralCode}
            className="w-full sm:w-auto"
          >
            Generate link
          </Button>
          <Input
            readOnly
            label="Generated URL"
            className="font-mono text-xs tracking-tight"
            value={
              generatedUrl ||
              (authLoading
                ? "Loading session…"
                : referralCode
                  ? 'Click "Generate link" to build your arena URL.'
                  : "Sign in required.")
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!generatedUrl}
              onClick={() => void copyToClipboard(generatedUrl, "link")}
              className="gap-2"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All channels</TabsTrigger>
            {ARENA_PLATFORM_KEYS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {ARENA_PLATFORM_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => void refreshAnalytics()}
            disabled={analyticsLoading || !uid}
          >
            Refresh data
          </Button>
        </div>

        {analyticsError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {analyticsError}
          </p>
        ) : null}

        <TabsContent value="all">
          <Card className="border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-4 w-4 text-violet-300" aria-hidden />
                All channels · Firestore
              </CardTitle>
              <CardDescription>
                Aggregated clicks and conversions across every tracked source for your UID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading || authLoading ? (
                <AnalyticsSkeleton />
              ) : (
                <MetricsBlock
                  clicks={totalClicks}
                  conversions={totalConversions}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {ARENA_PLATFORM_KEYS.map((key) => (
          <TabsContent key={key} value={key}>
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="text-base">
                  {ARENA_PLATFORM_LABELS[key]}
                </CardTitle>
                <CardDescription>
                  Events where <code className="text-zinc-500">platform</code> /{" "}
                  <code className="text-zinc-500">source</code> resolves to this channel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading || authLoading ? (
                  <AnalyticsSkeleton />
                ) : (
                  <MetricsBlock
                    clicks={byPlatform?.[key].clicks ?? 0}
                    conversions={byPlatform?.[key].conversions ?? 0}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
