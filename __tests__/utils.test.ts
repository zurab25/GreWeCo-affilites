import { describe, it, expect } from "vitest";
import { generateReferralId, cn } from "@/lib/utils";

describe("generateReferralId", () => {
  it("should generate an 8 character code by default", () => {
    const id = generateReferralId();
    expect(id).toHaveLength(8);
  });

  it("should generate custom length codes", () => {
    const id = generateReferralId(12);
    expect(id).toHaveLength(12);
  });

  it("should only use allowed characters", () => {
    const allowed = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let i = 0; i < 100; i++) {
      const id = generateReferralId();
      for (const char of id) {
        expect(allowed).toContain(char);
      }
    }
  });

  it("should not include ambiguous characters (0, O, 1, I)", () => {
    for (let i = 0; i < 100; i++) {
      const id = generateReferralId();
      expect(id).not.toMatch(/[01OI]/);
    }
  });
});

describe("cn", () => {
  it("should merge class names", () => {
    const result = cn("px-2", "py-2");
    expect(result).toContain("px-2");
    expect(result).toContain("py-2");
  });

  it("should handle conditional classes", () => {
    const active = true;
    const result = cn("base", active && "active");
    expect(result).toContain("active");
  });

  it("should handle tailwind merge conflicts", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });
});
