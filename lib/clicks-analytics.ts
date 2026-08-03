import {
  collection,
  onSnapshot,
  query,
  where,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";

import {
  ARENA_PLATFORM_KEYS,
  ARENA_PLATFORM_LABELS,
  isArenaPlatformKey,
  type ArenaPlatformKey,
} from "@/lib/platforms";

/** Manual referral-code / direct signups channel (non-social). */
export const CODE_CHANNEL = "code" as const;

/** All affiliate channels: the 4 socials plus the manual referral-code bucket. */
export const AFFILIATE_CHANNEL_KEYS = [
  ...ARENA_PLATFORM_KEYS,
  CODE_CHANNEL,
] as const;

export type AffiliateChannelKey = ArenaPlatformKey | typeof CODE_CHANNEL;

export const AFFILIATE_CHANNEL_LABELS: Record<AffiliateChannelKey, string> = {
  ...ARENA_PLATFORM_LABELS,
  code: "Referral code",
};

export type ChannelMetrics = Record<
  AffiliateChannelKey,
  { clicks: number; conversions: number }
>;

/** @deprecated Use ChannelMetrics — kept as an alias for existing imports. */
export type PlatformMetrics = ChannelMetrics;

function emptyByChannel(): ChannelMetrics {
  return {
    instagram: { clicks: 0, conversions: 0 },
    facebook: { clicks: 0, conversions: 0 },
    x: { clicks: 0, conversions: 0 },
    youtube: { clicks: 0, conversions: 0 },
    code: { clicks: 0, conversions: 0 },
  };
}

/**
 * Normalize a Firestore `platform`/`source` value to a channel key.
 * - twitter → x; one of the 4 socials → itself
 * - code / direct / referral → "code"
 * - anything else non-empty → "code" (safe default so events are never silently dropped)
 * - empty/absent → null
 */
function normalizeChannel(raw: unknown): AffiliateChannelKey | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "twitter") return "x";
  if (isArenaPlatformKey(s)) return s;
  if (s === "code" || s === "direct" || s === "referral") return CODE_CHANNEL;
  return CODE_CHANNEL;
}

export type GroupedAnalytics = {
  byPlatform: ChannelMetrics;
  totalClicks: number;
  totalConversions: number;
};

/** Group a `clicks_analytics` snapshot by channel (supports aggregate rows and per-event rows). */
function groupSnapshot(snap: QuerySnapshot<DocumentData>): GroupedAnalytics {
  const byPlatform = emptyByChannel();
  let totalClicks = 0;
  let totalConversions = 0;

  snap.forEach((docSnap) => {
    const d = docSnap.data() as Record<string, unknown>;
    const pk = normalizeChannel(d.platform ?? d.source);

    const hasAggregate =
      typeof d.clicks === "number" ||
      typeof d.conversions === "number" ||
      typeof d.clicks === "string" ||
      typeof d.conversions === "string";

    if (hasAggregate) {
      const c = Number(d.clicks) || 0;
      const v = Number(d.conversions) || 0;
      totalClicks += c;
      totalConversions += v;
      if (pk) {
        byPlatform[pk].clicks += c;
        byPlatform[pk].conversions += v;
      }
      return;
    }

    const kind = String(d.eventType ?? d.type ?? "")
      .trim()
      .toLowerCase();

    if (kind === "click" || kind === "clicks") {
      totalClicks += 1;
      if (pk) byPlatform[pk].clicks += 1;
    } else if (
      kind === "conversion" ||
      kind === "conversions" ||
      kind === "convert"
    ) {
      totalConversions += 1;
      if (pk) byPlatform[pk].conversions += 1;
    }
  });

  return { byPlatform, totalClicks, totalConversions };
}

/**
 * Subscribe to an affiliate's `clicks_analytics` in real time, grouped by channel.
 * Returns an unsubscribe function.
 */
export function subscribeClicksAnalyticsGrouped(
  db: Firestore,
  affiliateId: string,
  onData: (result: GroupedAnalytics) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, "clicks_analytics"),
    where("affiliateId", "==", affiliateId)
  );
  return onSnapshot(
    q,
    (snap) => onData(groupSnapshot(snap)),
    (err) => onError?.(err)
  );
}
