import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  AFFILIATES_APP_HOST,
  buildReferralLandingUrl,
  DOMAINS,
} from "@/lib/branding";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateReferralId(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = typeof crypto !== "undefined" && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint8Array(length))
    : Array.from({ length }, () => Math.floor(Math.random() * 256));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Number(bytes[i]) % chars.length];
  }
  return out;
}

/** @deprecated Prefer `DOMAINS.arena` from `@/lib/branding` */
export const AFFILIATE_BASE_URL = DOMAINS.arena;

/** Landing URL on Arena with referral code (`ref` query) */
export function buildReferralUrl(refId: string): string {
  return buildReferralLandingUrl(refId);
}

export { AFFILIATES_APP_HOST };
