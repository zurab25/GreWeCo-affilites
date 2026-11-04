import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual } from "crypto";

import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { ARENA_PLATFORM_KEYS } from "@/lib/platforms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventType = "click" | "conversion" | "code_check";

type LinkEventPayload = {
  eventType: EventType;
  affiliateId: string;
  source?: string;
  platform?: string;
  buyerId?: string;
  orderId?: string;
  timestamp?: number;
};

function isValidEventType(t: unknown): t is EventType {
  return t === "click" || t === "conversion" || t === "code_check";
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

const FIRST_SALE_COMMISSION_RATE = 0.1;

const HMAC_SECRET = process.env.LINK_EVENT_HMAC_SECRET;

const ALLOWED_ORIGINS = [
  "https://arena.grew.eco",
  "https://affiliates.grew.eco",
];

const CLICK_RATE_LIMIT_WINDOW_MS = 60_000;
const CLICK_RATE_LIMIT_MAX = 10;

const MAINNET_CLUSTERS = new Set(["mainnet-beta", "mainnet"]);

const clickRateLimitMap = new Map<
  string,
  { count: number; windowStart: number }
>();

export function verifyHmacSignature(
  payload: LinkEventPayload,
  signature: string,
  secret: string
): boolean {
  const dataToSign = [
    payload.eventType,
    payload.affiliateId,
    payload.orderId ?? "",
    payload.buyerId ?? "",
    payload.timestamp?.toString() ?? "",
  ].join("|");

  const expectedSig = createHmac("sha256", secret).update(dataToSign).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

export function isTimestampValidSeconds(timestampSeconds: number | undefined): boolean {
  if (typeof timestampSeconds !== "number" || !Number.isFinite(timestampSeconds)) {
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fiveMinutesSeconds = 5 * 60;
  return Math.abs(nowSeconds - timestampSeconds) < fiveMinutesSeconds;
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
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Grew-Signature, X-Grew-Timestamp",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const xGrewSignature = request.headers.get("x-grew-signature");
  const xGrewTimestamp = request.headers.get("x-grew-timestamp");

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

  const { eventType, affiliateId, source, platform, buyerId, orderId, timestamp } =
    body;

  const db = getAdminFirestore();

  const userQuery = await db
    .collection("users")
    .where("referralId", "==", affiliateId.trim())
    .limit(1)
    .get();

  let affiliateUid: string | null = null;
  let affiliateRole: string | null = null;
  let affiliateReferralId: string | null = null;

  if (!userQuery.empty) {
    const doc = userQuery.docs[0];
    affiliateUid = doc.id;
    affiliateRole = (doc.data().role as string) ?? null;
    affiliateReferralId = (doc.data().referralId as string) ?? null;
  } else {
    const userByUidDoc = await db.collection("users").doc(affiliateId).get();
    if (userByUidDoc.exists) {
      affiliateUid = affiliateId;
      affiliateRole = (userByUidDoc.data()?.role as string) ?? null;
      affiliateReferralId = (userByUidDoc.data()?.referralId as string) ?? null;
    }
  }

  if (eventType === "code_check") {
    const valid = affiliateUid !== null && affiliateRole === "affiliate";
    return NextResponse.json({ valid, affiliateId }, { headers: corsHeaders });
  }

  if (!affiliateUid) {
    return NextResponse.json(
      { error: "Affiliate not found", code: "AFFILIATE_NOT_FOUND" },
      { status: 404, headers: corsHeaders }
    );
  }

  if (affiliateRole !== "affiliate") {
    return NextResponse.json(
      { error: "User is not a registered affiliate", code: "NOT_AFFILIATE" },
      { status: 403, headers: corsHeaders }
    );
  }

  if (eventType === "conversion") {
    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required for conversions" },
        { status: 400, headers: corsHeaders }
      );
    }

    let isAuthenticated = false;
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice(7);
      try {
        const auth = getAdminAuth();
        const decoded = await auth.verifyIdToken(idToken);

        if (decoded.email_verified !== true) {
          return NextResponse.json(
            { error: "Email not verified", code: "EMAIL_NOT_VERIFIED" },
            { status: 401, headers: corsHeaders }
          );
        }

        const isServiceAccount =
          decoded.email?.endsWith("@greweco-bf4e0.iam.gserviceaccount.com") ||
          decoded.email?.endsWith("@grew.eco");
        if (isServiceAccount || decoded.admin === true) {
          isAuthenticated = true;
        }
      } catch (e) {
        console.warn("ID token verification failed:", e);
        return NextResponse.json(
          { error: "Invalid authentication token", code: "INVALID_TOKEN" },
          { status: 401, headers: corsHeaders }
        );
      }
    }

    if (!isAuthenticated && xGrewSignature && HMAC_SECRET) {
      const tsValue = xGrewTimestamp ? Number(xGrewTimestamp) : timestamp;

      if (!isTimestampValidSeconds(tsValue)) {
        return NextResponse.json(
          { error: "Request timestamp expired or invalid" },
          { status: 401, headers: corsHeaders }
        );
      }

      const payloadWithTs = { ...body, timestamp: tsValue };
      if (verifyHmacSignature(payloadWithTs, xGrewSignature, HMAC_SECRET)) {
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

  const fiatOrderDoc = await db.collection("fiatOrders").doc(safeOrderId).get();

  if (!fiatOrderDoc.exists) {
    return NextResponse.json(
      { error: "Order not found", code: "ORDER_NOT_FOUND" },
      { status: 404, headers: corsHeaders }
    );
  }

  const orderData = fiatOrderDoc.data() as Record<string, unknown>;

  if (orderData.testMode === true) {
    return NextResponse.json(
      { error: "Test orders are not eligible for commission", code: "TEST_ORDER" },
      { status: 400, headers: corsHeaders }
    );
  }

  if (String(orderData.paymentProvider || "") === "solana") {
    const solanaOrderId = String(orderData.solanaOrderId || safeOrderId);
    const solanaOrderDoc = await db
      .collection("solanaOrders")
      .doc(solanaOrderId)
      .get();

    if (solanaOrderDoc.exists) {
      const solanaData = solanaOrderDoc.data() as Record<string, unknown>;
      const cluster = String(solanaData.cluster ?? "");
      if (!MAINNET_CLUSTERS.has(cluster)) {
        return NextResponse.json(
          {
            error: "Devnet/testnet orders are not eligible for commission",
            code: "DEVNET_ORDER",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: "Solana order record not found",
          code: "SOLANA_ORDER_NOT_FOUND",
        },
        { status: 404, headers: corsHeaders }
      );
    }
  }

  const orderAffiliateCode =
    (orderData.affiliate as Record<string, unknown> | undefined)?.code ??
    (orderData.purchaseDetails as Record<string, unknown> | undefined)
      ?.affiliatePartnerCode ??
    null;

  if (!orderAffiliateCode) {
    return NextResponse.json(
      { error: "Order has no affiliate attribution", code: "NO_AFFILIATE_ON_ORDER" },
      { status: 400, headers: corsHeaders }
    );
  }

  const orderCodeNormalized = String(orderAffiliateCode).trim();
  const requestCodeNormalized = affiliateId.trim();

  const codeMatches =
    orderCodeNormalized === requestCodeNormalized ||
    orderCodeNormalized === affiliateReferralId;

  if (!codeMatches) {
    return NextResponse.json(
      {
        error: "Affiliate code does not match order attribution",
        code: "AFFILIATE_MISMATCH",
      },
      { status: 400, headers: corsHeaders }
    );
  }

  const orderUserId = String(orderData.userId ?? buyerId ?? "");
  if (orderUserId && orderUserId === affiliateUid) {
    return NextResponse.json(
      { error: "Self-referral is not allowed", code: "SELF_REFERRAL" },
      { status: 400, headers: corsHeaders }
    );
  }

  const orderAmountUsd =
    typeof orderData.totalAmountUsd === "number"
      ? orderData.totalAmountUsd
      : null;

  if (typeof orderAmountUsd !== "number" || orderAmountUsd <= 0) {
    return NextResponse.json(
      { error: "Order has no valid amount", code: "INVALID_ORDER_AMOUNT" },
      { status: 400, headers: corsHeaders }
    );
  }

  const orderStatus = orderData.status as string | undefined;
  if (orderStatus !== "completed") {
    return NextResponse.json(
      { error: "Order is not in completed state", code: "ORDER_NOT_COMPLETED" },
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
        return { alreadyExists: true, duplicate: true, commissionId: commissionDocId };
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

      return {
        alreadyExists: false,
        duplicate: false,
        commissionId: commissionDocId,
        commissionAmount,
        eventId: analyticsRef.id,
      };
    });

    if (result.alreadyExists) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          alreadyExists: true,
          eventId: result.commissionId,
          commissionId: result.commissionId,
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        eventType: "conversion",
        eventId: result.eventId,
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
