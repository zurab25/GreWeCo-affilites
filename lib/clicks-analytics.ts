import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from "firebase/firestore";

import {
  type ArenaPlatformKey,
  isArenaPlatformKey,
} from "@/lib/platforms";

export type PlatformMetrics = Record<
  ArenaPlatformKey,
  { clicks: number; conversions: number }
>;

function emptyByPlatform(): PlatformMetrics {
  return {
    instagram: { clicks: 0, conversions: 0 },
    facebook: { clicks: 0, conversions: 0 },
    x: { clicks: 0, conversions: 0 },
    youtube: { clicks: 0, conversions: 0 },
  };
}

/** Normalize Firestore platform / source strings to our channel keys */
function normalizePlatform(raw: unknown): ArenaPlatformKey | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "twitter") return "x";
  if (isArenaPlatformKey(s)) return s;
  return null;
}

/**
 * Fetch `clicks_analytics` for an affiliate and group by platform.
 * Supports (a) aggregate rows with numeric `clicks` / `conversions`, or
 * (b) per-event rows with `eventType` / `type` of `click` | `conversion`.
 */
export async function fetchClicksAnalyticsGrouped(
  db: Firestore,
  affiliateId: string
): Promise<{
  byPlatform: PlatformMetrics;
  totalClicks: number;
  totalConversions: number;
}> {
  const q = query(
    collection(db, "clicks_analytics"),
    where("affiliateId", "==", affiliateId)
  );

  const snap = await getDocs(q);
  const byPlatform = emptyByPlatform();
  let totalClicks = 0;
  let totalConversions = 0;

  snap.forEach((docSnap) => {
    const d = docSnap.data() as Record<string, unknown>;
    const platformRaw = d.platform ?? d.source;
    const pk = normalizePlatform(platformRaw);

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
    if (!pk) return;

    if (kind === "click" || kind === "clicks") {
      byPlatform[pk].clicks += 1;
      totalClicks += 1;
    } else if (
      kind === "conversion" ||
      kind === "conversions" ||
      kind === "convert"
    ) {
      byPlatform[pk].conversions += 1;
      totalConversions += 1;
    }
  });

  return { byPlatform, totalClicks, totalConversions };
}
