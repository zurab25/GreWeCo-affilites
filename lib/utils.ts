import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export const AFFILIATE_BASE_URL = "https://cree.eco";

export function buildReferralUrl(refId: string): string {
  const url = new URL(AFFILIATE_BASE_URL);
  url.searchParams.set("ref", refId);
  return url.toString();
}
