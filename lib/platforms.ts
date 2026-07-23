/** Lowercase `source` query values sent with `arena.grew.eco/join` links */
export const ARENA_PLATFORM_KEYS = [
  "instagram",
  "facebook",
  "x",
  "youtube",
] as const;

export type ArenaPlatformKey = (typeof ARENA_PLATFORM_KEYS)[number];

export const ARENA_PLATFORM_LABELS: Record<ArenaPlatformKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
};

export function isArenaPlatformKey(s: string): s is ArenaPlatformKey {
  return (ARENA_PLATFORM_KEYS as readonly string[]).includes(s);
}
