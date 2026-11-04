import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual } from "crypto";

import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
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
  idToken?: string;
  hmacSignature?: string;
  timestamp?: number;
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

const HMAC_SECRET = process.env.LINK_EVENT_HMAC_SECRET;

const ALLOWED_ORIGINS = [
  "https://arena.grew.eco",
  "https://affiliates.grew.eco",
];

const CLICK_RATE_LIMIT_WINDOW_MS = 60_000;
const CLICK_RATE_LIMIT_MAX = 10;
const clickRateLimitMap = new Map<string, { count: number; windowStart: number }>();

function verifyHmacSignature(
  payload: LinkEventPayload,
  signature: string
): boolean {
  if (!HMAC_SECRET) return false;

  const dataToSign = [
    payload.eventType,
    payload.affiliateId,
    payload.orderId ?? "",
    payload.buyerId ?? "",
    payload.timestamp?.toString() ?? "",
  ].join("|");

  const expectedSig = createHmac("sha256", HMAC_SECRET)
    .update(dataToSign)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

function isTimestampValid(timestamp: number | undefined): boolean {
  if (typeof timestamp !== "number") return false;
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;
  return Math.abs(now - timestamp) < fiveMinutesMs;
}

function checkClickRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = clickRateLimitMap.get(key);

  if (!entry || now - entry.windowStart > CLICK_RATE_LIMIT_WINDOW_MS) {
    clickRateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= CLICK_RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-HMAC-Signature",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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
    idToken,
    hmacSignature,
    timestamp,
  } = body;

  const db = getAdminFirestore();

  if (eventType === "conversion") {
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required for conversions" },
        { status: 400, headers: corsHeaders }
      );
    }

    let isAuthenticated = false;

    if (idToken) {
      try {
        const auth = getAdminAuth();
        const decoded = await auth.verifyIdToken(idToken);
        const isServiceAccount =
          decoded.email?.endsWith("@greweco-bf4e0.iam.gserviceaccount.com") ||
          decoded.email?.endsWith("@grew.eco");
        if (isServiceAccount || decoded.admin === true) {
          isAuthenticated = true;
        }
      } catch (e) {
        console.warn("ID token verification failed:", e);
      }
    }

    if (!isAuthenticated && hmacSignature && HMAC_SECRET) {
      if (!isTimestampValid(timestamp)) {
        return NextResponse.json(
          { error: "Request timestamp expired or invalid" },
          { status: 401, headers: corsHeaders }
        );
      }

      if (verifyHmacSignature(body, hmacSignature)) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        {
          error: "Conversions require server authentication (idToken or HMAC)",
          code: "AUTH_REQUIRED",
        },
        { status: 401, headers: corsHeaders }
      );
    }
  }

  if (eventType === "click") {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitKey = `${clientIp}:${affiliateId}`;

    if (!checkClickRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: corsHeaders }
      );
    }
  }

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

  if (eventType === "click") {
    const eventDoc = {
      affiliateId: affiliateUid,
      eventType,
      platform: resolvedPlatform,
      source: resolvedPlatform,
      createdAt: now,
    };

    const batch = db.batch();
    const eventRef = db.collection("clicks_analytics").doc();
    batch.set(eventRef, eventDoc);

    const userRef = db.collection("users").doc(affiliateUid);
    batch.update(userRef, {
      "stats.clicks": FieldValue.increment(1),
    });

    try {
      await batch.commit();
    } catch (e) {
      console.error("Failed to record click:", e);
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

  const safeOrderId = orderId!;

  const orderDoc = await db.collection("orders").doc(safeOrderId).get();
  let fiatOrderDoc = null;
  let solanaOrderDoc = null;

  if (!orderDoc.exists) {
    fiatOrderDoc = await db.collection("fiatOrders").doc(safeOrderId).get();
  }
  if (!orderDoc.exists && !fiatOrderDoc?.exists) {
    solanaOrderDoc = await db.collection("solanaOrders").doc(safeOrderId).get();
  }

  const foundOrderDoc = orderDoc.exists
    ? orderDoc
    : fiatOrderDoc?.exists
      ? fiatOrderDoc
      : solanaOrderDoc?.exists
        ? solanaOrderDoc
        : null;

  if (!foundOrderDoc) {
    return NextResponse.json(
      { error: "Order not found", code: "ORDER_NOT_FOUND" },
      { status: 404, headers: corsHeaders }
    );
  }

  const orderData = foundOrderDoc.data() as Record<string, unknown>;

  const orderAmountUsd =
    typeof orderData.totalUsd === "number"
      ? orderData.totalUsd
      : typeof orderData.amountUsd === "number"
        ? orderData.amountUsd
        : typeof orderData.total === "number"
          ? orderData.total
          : null;

  if (typeof orderAmountUsd !== "number" || orderAmountUsd <= 0) {
    return NextResponse.json(
      { error: "Order has no valid amount", code: "INVALID_ORDER_AMOUNT" },
      { status: 400, headers: corsHeaders }
    );
  }

  const orderStatus = orderData.status as string | undefined;
  if (orderStatus && !["completed", "fulfilled", "paid"].includes(orderStatus)) {
    return NextResponse.json(
      { error: "Order is not in a completed state", code: "ORDER_NOT_COMPLETED" },
      { status: 400, headers: corsHeaders }
    );
  }

  const commissionDocId = `commission-${safeOrderId}`;
  const commissionRef = db.collection("commissions").doc(commissionDocId);
  const userRef = db.collection("users").doc(affiliateUid);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const existingCommission = await transaction.get(commissionRef);

      if (existingCommission.exists) {
        return { alreadyExists: true, commissionId: commissionDocId };
      }

      const commissionAmount = orderAmountUsd * FIRST_SALE_COMMISSION_RATE;

      const analyticsRef = db.collection("clicks_analytics").doc();
      transaction.set(analyticsRef, {
        affiliateId: affiliateUid,
        eventType: "conversion",
        platform: resolvedPlatform,
        source: resolvedPlatform,
        orderId: safeOrderId,
        buyerId: buyerId || orderData.userId || null,
        orderAmountUsd,
        createdAt: now,
      });

      transaction.set(commissionRef, {
        affiliateId: affiliateUid,
        orderId: safeOrderId,
        buyerId: buyerId || orderData.userId || null,
        orderAmountUsd,
        commissionType: "first_sale",
        commissionRate: FIRST_SALE_COMMISSION_RATE,
        commissionAmountUsd: commissionAmount,
        status: "pending",
        createdAt: now,
      });

      transaction.update(userRef, {
        "stats.conversions": FieldValue.increment(1),
        "stats.earningsUsd": FieldValue.increment(commissionAmount),
        "earnings.pendingFirstSale": FieldValue.increment(commissionAmount),
      });

      return { alreadyExists: false, commissionId: commissionDocId, commissionAmount };
    });

    if (result.alreadyExists) {
      return NextResponse.json(
        {
          success: true,
          message: "Commission already recorded for this order",
          commissionId: result.commissionId,
          alreadyExists: true,
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        eventType: "conversion",
        affiliateId: affiliateUid,
        commissionId: result.commissionId,
        commissionAmountUsd: result.commissionAmount,
      },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error("Failed to record conversion:", e);
    return NextResponse.json(
      { error: "Failed to record conversion", code: "CONVERSION_FAILED" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
