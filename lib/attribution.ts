/**
 * Shared helpers for the affiliate attribution ingestion endpoint (`/api/attribution`).
 * Records CLICK and CONVERSION events (per social platform, or manual "code") into the
 * `clicks_analytics` collection, keyed by the affiliate's Auth UID.
 */
import { createHash } from "crypto";

export const AFFILIATE_PLATFORMS = ["instagram", "facebook", "x", "youtube"] as const;
export const SOURCE_CODE = "code" as const;

export type AffiliateSource = (typeof AFFILIATE_PLATFORMS)[number] | typeof SOURCE_CODE;
export type AttributionEventType = "click" | "conversion";

/** Normalize a raw `source` to a known channel: 4 socials, or "code" for manual/direct. */
export function normalizeSource(raw: unknown): AffiliateSource {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "twitter") return "x";
  if ((AFFILIATE_PLATFORMS as readonly string[]).includes(s)) return s as AffiliateSource;
  return SOURCE_CODE;
}

/** Origins allowed to POST attribution (Arena app). Configurable via env. */
export function allowedOrigins(): string[] {
  const fromEnv = String(process.env.ATTRIBUTION_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const defaults = [
    "https://arena.grew.eco",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  return fromEnv.length > 0 ? fromEnv : defaults;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = allowedOrigins();
  const ok = origin && allow.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allow[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** UTC day bucket, e.g. 20260803. */
export function dayBucket(d = new Date()): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/** Coarse, non-reversible hash of an IP for click de-duplication (privacy-preserving). */
export function hashIp(ip: string | null | undefined): string {
  const salt = process.env.ATTRIBUTION_IP_SALT ?? "greweco-affiliate";
  return createHash("sha256")
    .update(`${salt}:${ip ?? "unknown"}`)
    .digest("hex")
    .slice(0, 16);
}

/** Extract best-effort client IP from proxy headers. */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") || "unknown";
}
