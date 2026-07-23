import type { ArenaPlatformKey } from "@/lib/platforms";
import { ARENA_JOIN_URL } from "@/lib/branding";

/**
 * Full URL: `https://arena.grew.eco/join?ref={referralCode}&source={platform}`
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
  url.searchParams.set("ref", code);
  url.searchParams.set("source", platform);
  return url.toString();
}
