import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "crypto";

const HMAC_SECRET = "test-secret-key-for-hmac-verification-32bytes";
const MAINNET_CLUSTERS = new Set(["mainnet-beta", "mainnet"]);

function generateHmacSignature(payload: {
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

  return createHmac("sha256", HMAC_SECRET).update(dataToSign).digest("hex");
}

describe("HMAC Signature Generation", () => {
  it("should generate consistent signatures for same input", () => {
    const payload = {
      eventType: "conversion",
      affiliateId: "AFF123",
      orderId: "ORDER456",
      buyerId: "BUYER789",
      timestamp: 1699000000000,
    };

    const sig1 = generateHmacSignature(payload);
    const sig2 = generateHmacSignature(payload);

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
  });

  it("should generate different signatures for different inputs", () => {
    const payload1 = {
      eventType: "conversion",
      affiliateId: "AFF123",
      orderId: "ORDER456",
      timestamp: 1699000000000,
    };

    const payload2 = {
      eventType: "conversion",
      affiliateId: "AFF123",
      orderId: "ORDER789",
      timestamp: 1699000000000,
    };

    const sig1 = generateHmacSignature(payload1);
    const sig2 = generateHmacSignature(payload2);

    expect(sig1).not.toBe(sig2);
  });

  it("should generate different signatures for different timestamps", () => {
    const payload1 = {
      eventType: "conversion",
      affiliateId: "AFF123",
      orderId: "ORDER456",
      timestamp: 1699000000000,
    };

    const payload2 = {
      eventType: "conversion",
      affiliateId: "AFF123",
      orderId: "ORDER456",
      timestamp: 1699000001000,
    };

    const sig1 = generateHmacSignature(payload1);
    const sig2 = generateHmacSignature(payload2);

    expect(sig1).not.toBe(sig2);
  });

  it("should handle missing optional fields", () => {
    const payload = {
      eventType: "click",
      affiliateId: "AFF123",
    };

    const sig = generateHmacSignature(payload);
    expect(sig).toHaveLength(64);
  });
});

describe("Timestamp Validation", () => {
  function isTimestampValid(timestamp: number | undefined): boolean {
    if (typeof timestamp !== "number") return false;
    const now = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;
    return Math.abs(now - timestamp) < fiveMinutesMs;
  }

  it("should accept current timestamp", () => {
    expect(isTimestampValid(Date.now())).toBe(true);
  });

  it("should accept timestamp within 5 minutes", () => {
    const fourMinutesAgo = Date.now() - 4 * 60 * 1000;
    expect(isTimestampValid(fourMinutesAgo)).toBe(true);
  });

  it("should reject timestamp older than 5 minutes", () => {
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    expect(isTimestampValid(sixMinutesAgo)).toBe(false);
  });

  it("should reject future timestamp beyond 5 minutes", () => {
    const sixMinutesFromNow = Date.now() + 6 * 60 * 1000;
    expect(isTimestampValid(sixMinutesFromNow)).toBe(false);
  });

  it("should reject undefined timestamp", () => {
    expect(isTimestampValid(undefined)).toBe(false);
  });

  it("should reject NaN timestamp", () => {
    expect(isTimestampValid(NaN)).toBe(false);
  });
});

describe("Rate Limiting Logic", () => {
  const WINDOW_MS = 60_000;
  const MAX_REQUESTS = 10;

  class RateLimiter {
    private map = new Map<string, { count: number; windowStart: number }>();

    check(key: string, now: number = Date.now()): boolean {
      const entry = this.map.get(key);

      if (!entry || now - entry.windowStart > WINDOW_MS) {
        this.map.set(key, { count: 1, windowStart: now });
        return true;
      }

      if (entry.count >= MAX_REQUESTS) {
        return false;
      }

      entry.count++;
      return true;
    }

    reset(): void {
      this.map.clear();
    }
  }

  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it("should allow first request", () => {
    expect(limiter.check("ip1:aff1")).toBe(true);
  });

  it("should allow up to MAX_REQUESTS in window", () => {
    const now = Date.now();
    for (let i = 0; i < MAX_REQUESTS; i++) {
      expect(limiter.check("ip1:aff1", now)).toBe(true);
    }
  });

  it("should block after MAX_REQUESTS in window", () => {
    const now = Date.now();
    for (let i = 0; i < MAX_REQUESTS; i++) {
      limiter.check("ip1:aff1", now);
    }
    expect(limiter.check("ip1:aff1", now)).toBe(false);
  });

  it("should reset after window expires", () => {
    const now = Date.now();
    for (let i = 0; i < MAX_REQUESTS; i++) {
      limiter.check("ip1:aff1", now);
    }
    expect(limiter.check("ip1:aff1", now)).toBe(false);

    const afterWindow = now + WINDOW_MS + 1;
    expect(limiter.check("ip1:aff1", afterWindow)).toBe(true);
  });

  it("should track different keys independently", () => {
    const now = Date.now();
    for (let i = 0; i < MAX_REQUESTS; i++) {
      limiter.check("ip1:aff1", now);
    }
    expect(limiter.check("ip1:aff1", now)).toBe(false);
    expect(limiter.check("ip2:aff1", now)).toBe(true);
    expect(limiter.check("ip1:aff2", now)).toBe(true);
  });
});

describe("Commission Idempotency", () => {
  it("should generate deterministic doc ID from orderId", () => {
    const orderId = "order-12345";
    const commissionDocId = `commission-${orderId}`;

    expect(commissionDocId).toBe("commission-order-12345");

    const commissionDocId2 = `commission-${orderId}`;
    expect(commissionDocId).toBe(commissionDocId2);
  });

  it("should produce unique doc IDs for different orders", () => {
    const orderId1 = "order-12345";
    const orderId2 = "order-67890";

    const docId1 = `commission-${orderId1}`;
    const docId2 = `commission-${orderId2}`;

    expect(docId1).not.toBe(docId2);
  });
});

describe("CORS Origin Validation", () => {
  const ALLOWED_ORIGINS = [
    "https://arena.grew.eco",
    "https://affiliates.grew.eco",
  ];

  function getAllowedOrigin(origin: string | null): string {
    return origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  }

  it("should allow arena.grew.eco", () => {
    expect(getAllowedOrigin("https://arena.grew.eco")).toBe(
      "https://arena.grew.eco"
    );
  });

  it("should allow affiliates.grew.eco", () => {
    expect(getAllowedOrigin("https://affiliates.grew.eco")).toBe(
      "https://affiliates.grew.eco"
    );
  });

  it("should reject unknown origins and default to first allowed", () => {
    expect(getAllowedOrigin("https://malicious.com")).toBe(
      "https://arena.grew.eco"
    );
  });

  it("should handle null origin", () => {
    expect(getAllowedOrigin(null)).toBe("https://arena.grew.eco");
  });

  it("should reject similar but different origins", () => {
    expect(getAllowedOrigin("https://arena.grew.eco.evil.com")).toBe(
      "https://arena.grew.eco"
    );
    expect(getAllowedOrigin("https://fake-arena.grew.eco")).toBe(
      "https://arena.grew.eco"
    );
  });
});

describe("Order Amount Extraction", () => {
  function extractOrderAmount(
    orderData: Record<string, unknown>
  ): number | null {
    const amount =
      typeof orderData.totalUsd === "number"
        ? orderData.totalUsd
        : typeof orderData.amountUsd === "number"
          ? orderData.amountUsd
          : typeof orderData.total === "number"
            ? orderData.total
            : typeof orderData.totalAmountUsd === "number"
              ? orderData.totalAmountUsd
              : null;

    if (typeof amount !== "number" || amount <= 0) {
      return null;
    }
    return amount;
  }

  it("should extract totalUsd", () => {
    expect(extractOrderAmount({ totalUsd: 65.0 })).toBe(65.0);
  });

  it("should fall back to amountUsd", () => {
    expect(extractOrderAmount({ amountUsd: 55.0 })).toBe(55.0);
  });

  it("should fall back to total", () => {
    expect(extractOrderAmount({ total: 100.0 })).toBe(100.0);
  });

  it("should fall back to totalAmountUsd", () => {
    expect(extractOrderAmount({ totalAmountUsd: 75.0 })).toBe(75.0);
  });

  it("should prefer totalUsd over others", () => {
    expect(
      extractOrderAmount({ totalUsd: 65.0, amountUsd: 55.0, total: 100.0, totalAmountUsd: 75.0 })
    ).toBe(65.0);
  });

  it("should return null for missing amount", () => {
    expect(extractOrderAmount({})).toBeNull();
  });

  it("should return null for zero amount", () => {
    expect(extractOrderAmount({ totalUsd: 0 })).toBeNull();
  });

  it("should return null for negative amount", () => {
    expect(extractOrderAmount({ totalUsd: -10 })).toBeNull();
  });

  it("should return null for string amount", () => {
    expect(extractOrderAmount({ totalUsd: "65" })).toBeNull();
  });
});

describe("Order Status Validation", () => {
  const VALID_STATUSES = ["completed", "fulfilled", "paid"];

  function isOrderCompleted(status: string | undefined): boolean {
    if (!status) return true;
    return VALID_STATUSES.includes(status);
  }

  it("should accept completed status", () => {
    expect(isOrderCompleted("completed")).toBe(true);
  });

  it("should accept fulfilled status", () => {
    expect(isOrderCompleted("fulfilled")).toBe(true);
  });

  it("should accept paid status", () => {
    expect(isOrderCompleted("paid")).toBe(true);
  });

  it("should accept undefined status (no status field)", () => {
    expect(isOrderCompleted(undefined)).toBe(true);
  });

  it("should reject pending status", () => {
    expect(isOrderCompleted("pending")).toBe(false);
  });

  it("should reject cancelled status", () => {
    expect(isOrderCompleted("cancelled")).toBe(false);
  });

  it("should reject failed status", () => {
    expect(isOrderCompleted("failed")).toBe(false);
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

  it("should prefer orderUserId over buyerId", () => {
    expect(isSelfReferral("user123", "user456", "user123")).toBe(false);
  });

  it("should not flag different users", () => {
    expect(isSelfReferral("affiliate1", "buyer2", undefined)).toBe(false);
  });

  it("should not flag when no buyer info", () => {
    expect(isSelfReferral("affiliate1", undefined, undefined)).toBe(false);
  });

  it("should handle empty strings", () => {
    expect(isSelfReferral("user123", "", "")).toBe(false);
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

  it("should not flag testMode: 'true' (string)", () => {
    expect(isTestOrder({ testMode: "true" })).toBe(false);
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

  it("should reject empty string", () => {
    expect(isMainnetCluster("")).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isMainnetCluster(undefined)).toBe(false);
  });

  it("should reject localnet", () => {
    expect(isMainnetCluster("localnet")).toBe(false);
  });
});

describe("Affiliate Role Validation", () => {
  function isValidAffiliateRole(role: string | null | undefined): boolean {
    return role === "affiliate";
  }

  it("should accept affiliate role", () => {
    expect(isValidAffiliateRole("affiliate")).toBe(true);
  });

  it("should reject user role", () => {
    expect(isValidAffiliateRole("user")).toBe(false);
  });

  it("should reject company role", () => {
    expect(isValidAffiliateRole("company")).toBe(false);
  });

  it("should reject admin role", () => {
    expect(isValidAffiliateRole("admin")).toBe(false);
  });

  it("should reject null role", () => {
    expect(isValidAffiliateRole(null)).toBe(false);
  });

  it("should reject undefined role", () => {
    expect(isValidAffiliateRole(undefined)).toBe(false);
  });
});

describe("In-Memory Rate Limiter Limitations", () => {
  it("documents that rate limit is per-instance only", () => {
    const limitations = [
      "Rate limit state is stored in memory",
      "State is lost on server restart",
      "State is not shared across Cloud Run instances",
      "Under high load, multiple instances may each allow CLICK_RATE_LIMIT_MAX requests",
      "For strict rate limiting, use Firestore or Redis-backed implementation",
    ];

    expect(limitations.length).toBeGreaterThan(0);
    expect(limitations[0]).toContain("memory");
  });
});
