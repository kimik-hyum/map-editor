import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  estimateMapAnnotationHeight,
  getMapAnnotationMetrics,
  getMapAnnotationZoom,
} from "./mapAnnotationTheme";

describe("map annotation theme", () => {
  it.each([
    [0, 14, 32],
    [11.99, 14, 32],
    [12, 15, 34],
    [14.99, 15, 34],
    [15, 16, 36],
    [20, 16, 36],
  ])("zoom %s에서 이름 %spx와 버튼 %spx를 사용한다", (zoom, font, height) => {
    expect(getMapAnnotationMetrics(zoom)).toMatchObject({
      labelFontSize: font,
      buttonHeight: height,
    });
  });
  it("유효하지 않은 줌에서도 글자를 작게 만들지 않는다", () => {
    expect(getMapAnnotationMetrics(NaN).labelFontSize).toBe(14);
    expect(getMapAnnotationMetrics(Infinity).labelFontSize).toBe(14);
  });
  it("경계 스타일의 해상도가 UI와 같은 줌 단계로 변환된다", () => {
    for (const zoom of [0, 11, 12, 14, 15, 18]) {
      expect(getMapAnnotationZoom(156543.03392804097 / 2 ** zoom)).toBeCloseTo(zoom, 8);
    }
  });
  it("긴 한글 명칭의 줄바꿈 공간을 예약하고 3줄을 넘기지 않는다", () => {
    expect(estimateMapAnnotationHeight("삼청동", 12)).toBe(80);
    expect(
      estimateMapAnnotationHeight("서울특별시 종로구 종로1·2·3·4가동", 12),
    ).toBeGreaterThan(80);
    expect(estimateMapAnnotationHeight("가".repeat(200), 12)).toBe(124);
  });
  it("일반 버튼과 라벨의 텍스트 색상 대비는 최소 4.5:1이다", () => {
    const css = readFileSync(new URL("../../../index.css", import.meta.url), "utf8");
    const color = (name: string) =>
      css.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`))?.[1] ?? "";
    const luminance = (hex: string) => {
      const channels = [1, 3, 5]
        .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    for (const [fg, bg] of [
      ["#ffffff", color("brand")],
      ["#ffffff", color("brand-strong")],
      [color("brand-strong"), color("brand-soft")],
      [color("danger"), color("danger-soft")],
      [color("ink"), "#ffffff"],
    ]) {
      const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
      expect((light + 0.05) / (dark + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
