/**
 * Standalone referral code for Arena `ref=` and manual signup on the main platform.
 * Prefer Firestore `referralId`; fall back to Auth UID when missing.
 */
export function resolveAffiliateReferralCode(
  profile: { referralId?: string } | null | undefined,
  user: { uid?: string } | null | undefined
): string {
  const fromProfile = profile?.referralId?.trim();
  if (fromProfile) return fromProfile;
  return user?.uid?.trim() ?? "";
}
