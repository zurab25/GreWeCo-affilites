import type { ArenaPlatformKey } from "@/lib/platforms";
import { ARENA_JOIN_URL } from "@/lib/branding";

/**
 * Full URL: `https://arena.grew.eco/join?aff={referralCode}&source={platform}`
 * `referralCode` must match the affiliate's displayed referral ID (see `resolveAffiliateReferralCode`).
 *
 * Note: The live site uses `?aff=` parameter (not `?ref=`). Arena's JoinCapture reads `aff`
 * from the URL and posts events to affiliates.grew.eco/api/link-event.
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
