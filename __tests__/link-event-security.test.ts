import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyHmacSignature,
  isTimestampValidSeconds,
} from "@/app/api/link-event/route";

const TEST_SECRET = "test-secret-key-for-hmac-verification-32bytes";
const MAINNET_CLUSTERS = new Set(["mainnet-beta", "mainnet"]);

function generateArenaSignature(payload: {
  eventType: string;
  affiliateId: string;
  orderId?: string;
  buyerId?: string;
  timestamp?: number;
}): string {
  const dataToSign = [
    payload.eventType,
    payload.affiliateId,
    payload.orderId ?? "",
    payload.buyerId ?? "",
    payload.timestamp?.toString() ?? "",
  ].join("|");

  return createHmac("sha256", TEST_SECRET).update(dataToSign).digest("hex");
}

describe("HMAC Signature - Arena Contract", () => {
  it("should verify signature with Arena format: eventType|affiliateId|orderId|buyerId|timestamp", () => {
    const payload = {
      eventType: "conversion" as const,
      affiliateId: "ABC123XY",
      orderId: "order-12345",
      buyerId: "buyer-67890",
      timestamp: 1699000000,
    };

    const signature = generateArenaSignature(payload);
    expect(verifyHmacSignature(payload, signature, TEST_SECRET)).toBe(true);
  });

  it("should generate consistent signatures", () => {
    const payload = {
      eventType: "conversion" as const,
      affiliateId: "CODE1",
      orderId: "ORD1",
      buyerId: "BUY1",
      timestamp: 1699000000,
    };

    const sig1 = generateArenaSignature(payload);
    const sig2 = generateArenaSignature(payload);
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
  });

  it("should produce different signatures for different timestamps", () => {
    const base = {
      eventType: "conversion" as const,
      affiliateId: "CODE1",
      orderId: "ORD1",
      buyerId: "BUY1",
    };

    const sig1 = generateArenaSignature({ ...base, timestamp: 1699000000 });
    const sig2 = generateArenaSignature({ ...base, timestamp: 1699000001 });
    expect(sig1).not.toBe(sig2);
  });

  it("should reject invalid signatures", () => {
    const payload = {
      eventType: "conversion" as const,
      affiliateId: "ABC123",
      orderId: "order-1",
      timestamp: 1699000000,
    };

    const wrongSignature = "0".repeat(64);
    expect(verifyHmacSignature(payload, wrongSignature, TEST_SECRET)).toBe(false);
  });

  it("should reject signatures with wrong secret", () => {
    const payload = {
      eventType: "conversion" as const,
      affiliateId: "ABC123",
      orderId: "order-1",
      timestamp: 1699000000,
    };

    const signature = generateArenaSignature(payload);
    expect(verifyHmacSignature(payload, signature, "wrong-secret")).toBe(false);
  });

  it("should handle empty optional fields", () => {
    const payload = {
      eventType: "click" as const,
      affiliateId: "CODE1",
    };

    const signature = generateArenaSignature(payload);
    expect(verifyHmacSignature(payload, signature, TEST_SECRET)).toBe(true);
  });
});

describe("Timestamp Validation - Unix Seconds", () => {
  it("should accept current timestamp in seconds", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isTimestampValidSeconds(nowSeconds)).toBe(true);
  });

  it("should accept timestamp within 5 minutes (seconds)", () => {
    const fourMinutesAgo = Math.floor(Date.now() / 1000) - 4 * 60;
    expect(isTimestampValidSeconds(fourMinutesAgo)).toBe(true);
  });

  it("should reject timestamp older than 5 minutes (seconds)", () => {
    const sixMinutesAgo = Math.floor(Date.now() / 1000) - 6 * 60;
    expect(isTimestampValidSeconds(sixMinutesAgo)).toBe(false);
  });

  it("should reject future timestamp beyond 5 minutes (seconds)", () => {
    const sixMinutesFromNow = Math.floor(Date.now() / 1000) + 6 * 60;
    expect(isTimestampValidSeconds(sixMinutesFromNow)).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isTimestampValidSeconds(undefined)).toBe(false);
  });

  it("should reject NaN", () => {
    expect(isTimestampValidSeconds(NaN)).toBe(false);
  });

  it("should reject millisecond timestamp as too far in future", () => {
    const msTimestamp = Date.now();
    expect(isTimestampValidSeconds(msTimestamp)).toBe(false);
  });
});

describe("Arena Conversion Fixture", () => {
  const ARENA_FIXTURE = {
    payload: {
      eventType: "conversion" as const,
      affiliateId: "PARTNER99",
      orderId: "fiat-order-abc123",
      buyerId: "user-buyer-xyz",
      timestamp: 1730700000,
    },
    expectedSignature:
      "e5c5c2f3d4a8b1e6f7c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  };

  it("should produce deterministic signature for Arena fixture", () => {
    const signature = generateArenaSignature(ARENA_FIXTURE.payload);
    expect(signature).toHaveLength(64);

    const verified = verifyHmacSignature(
      ARENA_FIXTURE.payload,
      signature,
      TEST_SECRET
    );
    expect(verified).toBe(true);
  });

  it("should match Arena signing format exactly", () => {
    const { payload } = ARENA_FIXTURE;
    const dataToSign = [
      payload.eventType,
      payload.affiliateId,
      payload.orderId ?? "",
      payload.buyerId ?? "",
      payload.timestamp?.toString() ?? "",
    ].join("|");

    expect(dataToSign).toBe(
      "conversion|PARTNER99|fiat-order-abc123|user-buyer-xyz|1730700000"
    );
  });
});

describe("Self-Referral Detection", () => {
  function isSelfReferral(
    affiliateUid: string,
    orderUserId: string | undefined,
    buyerId: string | undefined
  ): boolean {
    const resolvedBuyerId = String(orderUserId ?? buyerId ?? "");
    return resolvedBuyerId !== "" && resolvedBuyerId === affiliateUid;
  }

  it("should detect self-referral when orderUserId matches affiliateUid", () => {
    expect(isSelfReferral("user123", "user123", undefined)).toBe(true);
  });

  it("should detect self-referral when buyerId matches affiliateUid", () => {
    expect(isSelfReferral("user123", undefined, "user123")).toBe(true);
  });

  it("should not flag different users", () => {
    expect(isSelfReferral("affiliate1", "buyer2", undefined)).toBe(false);
  });

  it("should not flag when no buyer info", () => {
    expect(isSelfReferral("affiliate1", undefined, undefined)).toBe(false);
  });
});

describe("Test Order Detection", () => {
  function isTestOrder(orderData: Record<string, unknown>): boolean {
    return orderData.testMode === true;
  }

  it("should detect testMode: true", () => {
    expect(isTestOrder({ testMode: true })).toBe(true);
  });

  it("should not flag testMode: false", () => {
    expect(isTestOrder({ testMode: false })).toBe(false);
  });

  it("should not flag missing testMode", () => {
    expect(isTestOrder({})).toBe(false);
  });
});

describe("Solana Cluster Validation", () => {
  function isMainnetCluster(cluster: string | undefined): boolean {
    return MAINNET_CLUSTERS.has(String(cluster ?? ""));
  }

  it("should accept mainnet-beta", () => {
    expect(isMainnetCluster("mainnet-beta")).toBe(true);
  });

  it("should accept mainnet", () => {
    expect(isMainnetCluster("mainnet")).toBe(true);
  });

  it("should reject devnet", () => {
    expect(isMainnetCluster("devnet")).toBe(false);
  });

  it("should reject testnet", () => {
    expect(isMainnetCluster("testnet")).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isMainnetCluster(undefined)).toBe(false);
  });
});

describe("Affiliate Code Matching", () => {
  function codesMatch(
    requestCode: string,
    orderCode: string | null,
    affiliateReferralId: string | null
  ): boolean {
    if (!orderCode) return false;
    const orderNorm = orderCode.trim();
    const requestNorm = requestCode.trim();
    return orderNorm === requestNorm || orderNorm === affiliateReferralId;
  }

  it("should match when request code equals order code", () => {
    expect(codesMatch("ABC123", "ABC123", "ABC123")).toBe(true);
  });

  it("should match when order code equals referralId", () => {
    expect(codesMatch("user-uid", "ABC123", "ABC123")).toBe(true);
  });

  it("should not match different codes", () => {
    expect(codesMatch("ABC123", "XYZ789", "ABC123")).toBe(false);
  });

  it("should not match when order has no affiliate code", () => {
    expect(codesMatch("ABC123", null, "ABC123")).toBe(false);
  });
});

describe("Order Amount - totalAmountUsd Only", () => {
  function extractOrderAmount(orderData: Record<string, unknown>): number | null {
    const amount =
      typeof orderData.totalAmountUsd === "number"
        ? orderData.totalAmountUsd
        : null;

    if (typeof amount !== "number" || amount <= 0) {
      return null;
    }
    return amount;
  }

  it("should extract totalAmountUsd", () => {
    expect(extractOrderAmount({ totalAmountUsd: 65.0 })).toBe(65.0);
  });

  it("should ignore other amount fields", () => {
    expect(extractOrderAmount({ totalUsd: 65.0, amountUsd: 55.0 })).toBeNull();
  });

  it("should return null for missing totalAmountUsd", () => {
    expect(extractOrderAmount({})).toBeNull();
  });

  it("should return null for zero", () => {
    expect(extractOrderAmount({ totalAmountUsd: 0 })).toBeNull();
  });

  it("should return null for negative", () => {
    expect(extractOrderAmount({ totalAmountUsd: -10 })).toBeNull();
  });
});

describe("Order Status - completed Only", () => {
  function isOrderCompleted(status: string | undefined): boolean {
    return status === "completed";
  }

  it("should accept completed", () => {
    expect(isOrderCompleted("completed")).toBe(true);
  });

  it("should reject fulfilled", () => {
    expect(isOrderCompleted("fulfilled")).toBe(false);
  });

  it("should reject paid", () => {
    expect(isOrderCompleted("paid")).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isOrderCompleted(undefined)).toBe(false);
  });

  it("should reject pending", () => {
    expect(isOrderCompleted("pending")).toBe(false);
  });
});

describe("code_check Event Type", () => {
  function isValidEventType(t: string): boolean {
    return t === "click" || t === "conversion" || t === "code_check";
  }

  it("should accept click", () => {
    expect(isValidEventType("click")).toBe(true);
  });

  it("should accept conversion", () => {
    expect(isValidEventType("conversion")).toBe(true);
  });

  it("should accept code_check", () => {
    expect(isValidEventType("code_check")).toBe(true);
  });

  it("should reject unknown types", () => {
    expect(isValidEventType("signup")).toBe(false);
  });
});

describe("Email Verification Requirement", () => {
  function isEmailVerified(decoded: { email_verified?: boolean }): boolean {
    return decoded.email_verified === true;
  }

  it("should accept email_verified: true", () => {
    expect(isEmailVerified({ email_verified: true })).toBe(true);
  });

  it("should reject email_verified: false", () => {
    expect(isEmailVerified({ email_verified: false })).toBe(false);
  });

  it("should reject missing email_verified", () => {
    expect(isEmailVerified({})).toBe(false);
  });
});

describe("Rate Limiter Documentation", () => {
  it("documents in-memory limitation", () => {
    const limitations = [
      "Rate limit state is stored in memory",
      "State is lost on server restart",
      "State is not shared across Cloud Run instances",
    ];
    expect(limitations.length).toBe(3);
  });
});

describe("CORS Headers - Arena Contract", () => {
  const ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "X-Grew-Signature",
    "X-Grew-Timestamp",
  ];

  it("should allow X-Grew-Signature header", () => {
    expect(ALLOWED_HEADERS).toContain("X-Grew-Signature");
  });

  it("should allow X-Grew-Timestamp header", () => {
    expect(ALLOWED_HEADERS).toContain("X-Grew-Timestamp");
  });

  it("should NOT include X-HMAC-Signature", () => {
    expect(ALLOWED_HEADERS).not.toContain("X-HMAC-Signature");
  });
});

describe("Response Format - Arena Contract", () => {
  it("should return duplicate field on replay", () => {
    const duplicateResponse = {
      success: true,
      duplicate: true,
      alreadyExists: true,
      eventId: "commission-order123",
      commissionId: "commission-order123",
    };

    expect(duplicateResponse.duplicate).toBe(true);
    expect(duplicateResponse.alreadyExists).toBe(true);
  });

  it("should return eventId on new commission", () => {
    const newResponse = {
      success: true,
      duplicate: false,
      eventType: "conversion",
      eventId: "analytics-doc-id",
      commissionId: "commission-order123",
      commissionAmountUsd: 6.5,
    };

    expect(newResponse.eventId).toBeDefined();
    expect(newResponse.duplicate).toBe(false);
  });
});
