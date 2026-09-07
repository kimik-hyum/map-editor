import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import type OpenLayersMap from "ol/Map";
import Observable from "ol/Observable";
import { attachRegionBoundaryLayer } from "./attachRegionBoundaryLayer";
import { describe, expect, it } from "vitest";
import {
  createRegionBoundaryLayer,
  setRegionBoundaryActionIds,
} from "./createRegionBoundaryLayer";

describe("region boundary labels", () => {
  it("응답 종류가 행정동일 때만 검은색 2.5px 선을 쓰고 다른 종류로 바뀌면 복원한다", () => {
    const map = Object.assign(new Observable(), {
      getSize: () => undefined,
      addLayer: () => {},
      removeLayer: () => {},
    }) as unknown as OpenLayersMap;
    const attachment = attachRegionBoundaryLayer(map, { onViewChange: () => {} });
    const feature = new Feature({ name: "테스트 경계" });
    feature.setId(1);
    for (const kind of [
      "adminDong",
      "legalDong",
      "adminDong",
      "postalCode",
      "sigungu",
    ]) {
      attachment.sync({ type: "FeatureCollection", kind, features: [] });
      for (const withCard of [false, true]) {
        setRegionBoundaryActionIds(attachment.layer, new Set(withCard ? ["1"] : []));
        const styles = attachment.layer.getStyleFunction()?.(feature, 100);
        if (!Array.isArray(styles)) throw new Error("expected boundary styles");
        expect(styles[0].getStroke()?.getColor()).toBe(
          kind === "adminDong" ? "#000000" : "#0f766e",
        );
        expect(styles[0].getStroke()?.getWidth()).toBe(
          kind === "adminDong" ? 2.5 : 1.5,
        );
      }
    }
    attachment.sync(null);
    expect(attachment.layer.get("boundaryKind")).toBeUndefined();
    attachment.detach();
  });
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
