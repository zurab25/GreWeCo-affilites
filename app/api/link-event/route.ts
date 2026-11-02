import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase-admin";
import { ARENA_PLATFORM_KEYS } from "@/lib/platforms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventType = "click" | "conversion";

type LinkEventPayload = {
  eventType: EventType;
  affiliateId: string;
  source?: string;
  platform?: string;
  buyerId?: string;
  orderId?: string;
  orderAmountUsd?: number;
  idToken?: string;
};

function isValidEventType(t: unknown): t is EventType {
  return t === "click" || t === "conversion";
}

function normalizePlatform(raw: unknown): string | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "twitter") return "x";
  if ((ARENA_PLATFORM_KEYS as readonly string[]).includes(s)) return s;
  return s;
}

function isValidPayload(body: unknown): body is LinkEventPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    isValidEventType(b.eventType) &&
    typeof b.affiliateId === "string" &&
    b.affiliateId.trim().length > 0
  );
}

const FIRST_SALE_COMMISSION_RATE = 0.10;

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Missing required fields: eventType, affiliateId" },
      { status: 400, headers: corsHeaders }
    );
  }

  const {
    eventType,
    affiliateId,
    source,
    platform,
    buyerId,
    orderId,
    orderAmountUsd,
  } = body;

  const db = getAdminFirestore();

  const userQuery = await db
    .collection("users")
    .where("referralId", "==", affiliateId.trim())
    .limit(1)
    .get();

  let affiliateUid: string | null = null;

  if (!userQuery.empty) {
    affiliateUid = userQuery.docs[0].id;
  } else {
    const userByUidDoc = await db.collection("users").doc(affiliateId).get();
    if (userByUidDoc.exists) {
      affiliateUid = affiliateId;
    }
  }

  if (!affiliateUid) {
    return NextResponse.json(
      { error: "Affiliate not found", code: "AFFILIATE_NOT_FOUND" },
      { status: 404, headers: corsHeaders }
    );
  }

  const resolvedPlatform = normalizePlatform(platform ?? source);
  const now = FieldValue.serverTimestamp();

  const eventDoc = {
    affiliateId: affiliateUid,
    eventType,
    platform: resolvedPlatform,
    source: resolvedPlatform,
    createdAt: now,
    ...(buyerId && { buyerId }),
    ...(orderId && { orderId }),
    ...(typeof orderAmountUsd === "number" && { orderAmountUsd }),
  };

  const clicksRef = db.collection("clicks_analytics");
  const userRef = db.collection("users").doc(affiliateUid);

  const batch = db.batch();

  const eventRef = clicksRef.doc();
  batch.set(eventRef, eventDoc);

  if (eventType === "click") {
    batch.update(userRef, {
      "stats.clicks": FieldValue.increment(1),
    });
  } else if (eventType === "conversion") {
    batch.update(userRef, {
      "stats.conversions": FieldValue.increment(1),
    });

    if (typeof orderAmountUsd === "number" && orderAmountUsd > 0 && orderId) {
      const commissionAmount = orderAmountUsd * FIRST_SALE_COMMISSION_RATE;

      const commissionRef = db.collection("commissions").doc();
      batch.set(commissionRef, {
        affiliateId: affiliateUid,
        orderId,
        buyerId: buyerId || null,
        orderAmountUsd,
        commissionType: "first_sale",
        commissionRate: FIRST_SALE_COMMISSION_RATE,
        commissionAmountUsd: commissionAmount,
        status: "pending",
        createdAt: now,
      });

      batch.update(userRef, {
        "stats.earningsUsd": FieldValue.increment(commissionAmount),
        "earnings.pendingFirstSale": FieldValue.increment(commissionAmount),
      });
    }
  }

  try {
    await batch.commit();
  } catch (e) {
    console.error("Failed to record event:", e);
    return NextResponse.json(
      { error: "Failed to record event", code: "EVENT_FAILED" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      success: true,
      eventId: eventRef.id,
      eventType,
      affiliateId: affiliateUid,
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
