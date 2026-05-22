import type { ArenaPlatformKey } from "@/lib/platforms";

const ARENA_JOIN_BASE = "https://arena.cree.eco/join";

export function buildArenaJoinUrl(uid: string, platform: ArenaPlatformKey): string {
  const url = new URL(ARENA_JOIN_BASE);
  url.searchParams.set("ref", uid);
  url.searchParams.set("source", platform);
  return url.toString();
}
