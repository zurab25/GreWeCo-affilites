import { describe, it, expect } from "vitest";
import { buildArenaJoinUrl } from "@/lib/arena";

describe("buildArenaJoinUrl", () => {
  it("should build a URL with aff parameter", () => {
    const url = buildArenaJoinUrl("ABC123", "instagram");
    expect(url).toBe("https://arena.grew.eco/join?aff=ABC123&source=instagram");
  });

  it("should use aff parameter, not ref", () => {
    const url = buildArenaJoinUrl("XYZ789", "facebook");
    expect(url).toContain("aff=XYZ789");
    expect(url).not.toContain("ref=");
  });

  it("should include source parameter", () => {
    const url = buildArenaJoinUrl("CODE1", "x");
    expect(url).toContain("source=x");
  });

  it("should trim referral code", () => {
    const url = buildArenaJoinUrl("  TRIMME  ", "youtube");
    expect(url).toContain("aff=TRIMME");
  });

  it("should throw if referral code is empty", () => {
    expect(() => buildArenaJoinUrl("", "instagram")).toThrow();
    expect(() => buildArenaJoinUrl("   ", "instagram")).toThrow();
  });
});
