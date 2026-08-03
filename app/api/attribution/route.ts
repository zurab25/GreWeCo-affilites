import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import {
  clientIpFrom,
  corsHeaders,
  dayBucket,
  hashIp,
  normalizeSource,
  type AttributionEventType,
} from "@/lib/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/**
 * Validate a referral code: `GET /api/attribution?ref=CODE`.
 * Returns `{ valid: boolean }`. Never writes. Used by Arena to reject unknown codes.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const ref = String(req.nextUrl.searchParams.get("ref") ?? "").trim();
  if (!ref) return json({ valid: false, error: "missing_ref" }, 400, origin);
  try {
    const affiliateId = await resolveAffiliateUid(ref);
    return json({ valid: Boolean(affiliateId) }, 200, origin);
  } catch (err) {
    console.error("attribution validate failed:", err);
    return json({ valid: false, error: "validate_unavailable" }, 500, origin);
  }
}

/**
 * Resolve an affiliate referral code to the affiliate's Auth UID.
 * The shared link/code is the affiliate's `referralId`; fall back to treating it as a UID.
 */
async function resolveAffiliateUid(ref: string): Promise<string | null> {
  const db = getAdminDb();
  const byReferral = await db
    .collection("users")
    .where("referralId", "==", ref)
    .limit(1)
    .get();
  if (!byReferral.empty) return byReferral.docs[0]!.id;

  const byUid = await db.collection("users").doc(ref).get();
  if (byUid.exists) return byUid.id;

  return null;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  let payload: {
    ref?: unknown;
    source?: unknown;
    eventType?: unknown;
    arenaUid?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, origin);
  }

  const ref = String(payload.ref ?? "").trim();
  const eventType = String(payload.eventType ?? "").trim() as AttributionEventType;
  const source = normalizeSource(payload.source);
  const arenaUid = String(payload.arenaUid ?? "").trim();

  if (!ref) return json({ ok: false, error: "missing_ref" }, 400, origin);
  if (eventType !== "click" && eventType !== "conversion") {
    return json({ ok: false, error: "invalid_eventType" }, 400, origin);
  }
  if (eventType === "conversion" && !arenaUid) {
    return json({ ok: false, error: "missing_arenaUid" }, 400, origin);
  }

  const ip = clientIpFrom(req.headers);

  try {
    const affiliateId = await resolveAffiliateUid(ref);
    // Unknown code: respond 200 so the beacon is a no-op, but record nothing.
    if (!affiliateId) return json({ ok: false, reason: "unknown_ref" }, 200, origin);

    const db = getAdminDb();

    if (eventType === "conversion") {
      // Idempotent: one conversion per arena user, ever.
      const marker = db.collection("affiliate_attributed_signups").doc(arenaUid);
      const already = await marker.get();
      if (already.exists) {
        return json({ ok: true, deduped: true, affiliateId }, 200, origin);
      }
      await marker.set({
        affiliateId,
        refCode: ref,
        platform: source,
        createdAt: FieldValue.serverTimestamp(),
      });
      await db.collection("clicks_analytics").add({
        affiliateId,
        refCode: ref,
        platform: source,
        eventType: "conversion",
        arenaUid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return json({ ok: true, recorded: "conversion", affiliateId, platform: source }, 200, origin);
    }

    // click: dedupe per (affiliate, platform, day, coarse-IP) to prevent inflation.
    const dedupeId = `click_${affiliateId}_${source}_${dayBucket()}_${hashIp(ip)}`;
    const clickRef = db.collection("clicks_analytics").doc(dedupeId);
    const existing = await clickRef.get();
    if (existing.exists) {
      return json({ ok: true, deduped: true, affiliateId }, 200, origin);
    }
    await clickRef.set({
      affiliateId,
      refCode: ref,
      platform: source,
      eventType: "click",
      createdAt: FieldValue.serverTimestamp(),
    });
    return json({ ok: true, recorded: "click", affiliateId, platform: source }, 200, origin);
  } catch (err) {
    console.error("attribution write failed:", err);
    return json({ ok: false, error: "write_failed" }, 500, origin);
  }
}
