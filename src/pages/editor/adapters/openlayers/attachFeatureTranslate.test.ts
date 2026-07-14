import { describe, expect, it } from "vitest";
import { isFeatureTranslateModifierActive } from "./attachFeatureTranslate";

const noModifier = {
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
};

describe("isFeatureTranslateModifierActive", () => {
  it("Cmd 또는 Ctrl만 누른 경우 도형 이동을 허용한다", () => {
    expect(isFeatureTranslateModifierActive({ ...noModifier, metaKey: true })).toBe(
      true,
    );
    expect(isFeatureTranslateModifierActive({ ...noModifier, ctrlKey: true })).toBe(
      true,
    );
  });

  it("보조키가 없거나 Shift/Alt가 함께 눌리면 허용하지 않는다", () => {
    expect(isFeatureTranslateModifierActive(noModifier)).toBe(false);
    expect(
      isFeatureTranslateModifierActive({
        ...noModifier,
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
    expect(
      isFeatureTranslateModifierActive({
        ...noModifier,
        metaKey: true,
        altKey: true,
      }),
    ).toBe(false);
  });
});
