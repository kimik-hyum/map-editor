import { describe, expect, it } from "vitest";
import { MAX_FEATURE_NAME_LENGTH, normalizeFeatureName } from "./featureName";

describe("normalizeFeatureName", () => {
  it("앞뒤 공백을 제거한 이름을 반환한다", () => {
    expect(normalizeFeatureName("  배송 권역  ")).toBe("배송 권역");
  });

  it("빈 이름과 최대 길이 초과를 거부한다", () => {
    expect(normalizeFeatureName("   ")).toBeNull();
    expect(normalizeFeatureName("가".repeat(MAX_FEATURE_NAME_LENGTH + 1))).toBeNull();
  });

  it("최대 길이까지 허용한다", () => {
    const name = "가".repeat(MAX_FEATURE_NAME_LENGTH);
    expect(normalizeFeatureName(name)).toBe(name);
  });
});
