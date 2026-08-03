import type { ArenaPlatformKey } from "@/lib/platforms";
import { ARENA_JOIN_URL } from "@/lib/branding";

/**
 * Full URL: `https://arena.grew.eco/join?aff={referralCode}&source={platform}`
 *
 * Uses the `aff` param (NOT `ref`) so it never collides with Arena's own internal
 * referral system, which captures `?ref=` into its `grew_ref_code` storage. Arena's
 * `/join` route reads `aff`/`source` into the separate affiliate-attribution keys.
 * `referralCode` must match the affiliate's displayed referral ID (see `resolveAffiliateReferralCode`).
 */
export function buildArenaJoinUrl(
  referralCode: string,
  platform: ArenaPlatformKey
): string {
  const code = referralCode.trim();
  if (!code) {
    throw new Error("Referral code is required to build an Arena join URL.");
  }
  const url = new URL(ARENA_JOIN_URL);
  url.searchParams.set("aff", code);
  url.searchParams.set("source", platform);
  return url.toString();
}
