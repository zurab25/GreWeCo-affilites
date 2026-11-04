import { describe, it, expect } from "vitest";
import {
  ARENA_PLATFORM_KEYS,
  ARENA_PLATFORM_LABELS,
  isArenaPlatformKey,
} from "@/lib/platforms";

describe("ARENA_PLATFORM_KEYS", () => {
  it("should contain all supported platforms", () => {
    expect(ARENA_PLATFORM_KEYS).toContain("instagram");
    expect(ARENA_PLATFORM_KEYS).toContain("facebook");
    expect(ARENA_PLATFORM_KEYS).toContain("x");
    expect(ARENA_PLATFORM_KEYS).toContain("youtube");
  });
});

describe("ARENA_PLATFORM_LABELS", () => {
  it("should have labels for all platform keys", () => {
    for (const key of ARENA_PLATFORM_KEYS) {
      expect(ARENA_PLATFORM_LABELS[key]).toBeDefined();
      expect(typeof ARENA_PLATFORM_LABELS[key]).toBe("string");
    }
  });
});

describe("isArenaPlatformKey", () => {
  it("should return true for valid keys", () => {
    expect(isArenaPlatformKey("instagram")).toBe(true);
    expect(isArenaPlatformKey("facebook")).toBe(true);
    expect(isArenaPlatformKey("x")).toBe(true);
    expect(isArenaPlatformKey("youtube")).toBe(true);
  });

  it("should return false for invalid keys", () => {
    expect(isArenaPlatformKey("twitter")).toBe(false);
    expect(isArenaPlatformKey("tiktok")).toBe(false);
    expect(isArenaPlatformKey("")).toBe(false);
    expect(isArenaPlatformKey("INSTAGRAM")).toBe(false);
  });
});
