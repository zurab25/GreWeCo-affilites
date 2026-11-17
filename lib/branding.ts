/**
 * GreWeCo Arena-aligned domains. Import from here instead of hard-coding URLs.
 */
export const DOMAINS = {
  /** This affiliate dashboard (canonical host) */
  affiliatesApp: "https://affiliates.grew.eco",
  /** Main Arena product */
  arena: "https://arena.grew.eco",
  /** Public marketing root */
  marketing: "https://grew.eco",
} as const;

export const ARENA_JOIN_URL = `${DOMAINS.arena}/join` as const;

/** Copy for UI labels (host + path, no scheme) */
export const ARENA_JOIN_PATH_LABEL = "arena.grew.eco/join" as const;

/** Display copy */
export const AFFILIATES_APP_HOST = "affiliates.grew.eco" as const;
export const CONTACT_EMAIL = "contact@grew.eco" as const;

/** @deprecated Use CONTACT_EMAIL */
export const CONTACT_PARTNERS_EMAIL = CONTACT_EMAIL;

export const DISCORD_COMMUNITY_URL = "https://discord.gg/NzVCPtus" as const;

/** Official GreWeCo brand palette (brand kit) */
export const BRAND_COLORS = {
  forestGreen: "#386337",
  stoneGray: "#B4B6B5",
  abyssBlue: "#030617",
  midnightNavy: "#101628",
  arcticWhite: "#F2F5F8",
  /** App shell canvas (Arena glass UI) */
  arenaNoir: "#050508",
} as const;

export function buildReferralLandingUrl(refId: string): string {
  const url = new URL(DOMAINS.arena);
  url.searchParams.set("aff", refId);
  return url.toString();
}
