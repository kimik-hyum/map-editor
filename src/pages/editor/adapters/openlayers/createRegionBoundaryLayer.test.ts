import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import { describe, expect, it } from "vitest";
import {
  createRegionBoundaryLayer,
  setRegionBoundaryActionIds,
} from "./createRegionBoundaryLayer";

describe("region boundary labels", () => {
  it("줌별 이름은 얇은 글자 테두리만 사용하고 불투명한 배경은 그리지 않는다", () => {
    const feature = new Feature({
      name: "서울특별시 종로구 삼청동",
      geometry: new Polygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 0],
        ],
      ]),
    });
    const layer = createRegionBoundaryLayer();
    const style = layer.getStyleFunction();
    for (const [zoom, size] of [
      [10, 13],
      [12, 14],
      [15, 14],
    ]) {
      const styles = style?.(feature, 156543.03392804097 / 2 ** zoom);
      if (!Array.isArray(styles)) throw new Error("expected label styles");
      expect(styles[1].getText()?.getFont()).toContain(`${size}px`);
      expect(styles[1].getText()?.getText()).toContain("삼청동");
      expect(styles[1].getText()?.getBackgroundFill()).toBeNull();
      expect(styles[1].getText()?.getBackgroundStroke()).toBeNull();
      expect(styles[1].getText()?.getStroke()?.getWidth()).toBe(2);
    }
  });
  it("작업 카드와 캔버스 이름을 중복 표시하지 않고 카드가 사라지면 복원한다", () => {
    const feature = new Feature({ name: "101" });
    feature.setId(101);
    const layer = createRegionBoundaryLayer();
    const style = layer.getStyleFunction();
    expect(style?.(feature, 100)).toHaveLength(2);
    setRegionBoundaryActionIds(layer, new Set(["101"]));
    expect(style?.(feature, 100)).toHaveLength(1);
    const revision = layer.getRevision();
    setRegionBoundaryActionIds(layer, new Set(["101"]));
    expect(layer.getRevision()).toBe(revision);
    setRegionBoundaryActionIds(layer, new Set());
    expect(style?.(feature, 100)).toHaveLength(2);
  });
});
