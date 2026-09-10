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
  it("지구 전체로 축소해도 스냅 bbox가 극점을 넘지 않는다", () => {
    const map = Object.assign(new Observable(), {
      getSize: () => [1200, 800],
      getView: () => ({
        calculateExtent: () => [-25000000, -22000000, 25000000, 22000000],
        getZoom: () => 0,
        getCenter: () => [0, 0],
      }),
      addLayer: () => {},
      removeLayer: () => {},
    }) as unknown as OpenLayersMap;
    const attachment = attachRegionBoundaryLayer(map, {
      onViewChange: (view) => {
        expect(view).toMatchObject({
          minLng: -180,
          minLat: -85,
          maxLng: 180,
          maxLat: 85,
        });
      },
    });
    attachment.detach();
  });
  it("부분 응답을 추가해도 기존 OL feature를 지우지 않고 이전 화면의 ID만 제거한다", () => {
    const map = Object.assign(new Observable(), {
      getSize: () => undefined,
      addLayer: () => {},
      removeLayer: () => {},
    }) as unknown as OpenLayersMap;
    const attachment = attachRegionBoundaryLayer(map, { onViewChange: () => {} });
    const source = attachment.layer.getSource();
    if (!source) throw new Error("expected boundary source");
    const a = {
      type: "Feature",
      id: 1,
      properties: { name: "A" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    };
    const b = { ...a, id: 2 };
    attachment.sync({ features: [a] });
    const first = source.getFeatureById(1);
    let clears = 0;
    source.on("clear", () => {
      clears++;
    });
    attachment.sync({ features: [a, a, b] });
    expect(source.getFeatures()).toHaveLength(2);
    expect(source.getFeatureById(1)).toBe(first);
    expect(clears).toBe(0);
    attachment.sync({ features: [b] });
    expect(source.getFeatureById(1)).toBeNull();
    expect(source.getFeatures()).toHaveLength(1);
    attachment.sync({ features: [{ ...b, properties: { name: "새 버전" } }] });
    expect(source.getFeatureById(2)?.get("name")).toBe("새 버전");
    attachment.sync(null);
    expect(source.getFeatures()).toHaveLength(0);
    attachment.detach();
  });
  it("모든 참고 경계는 종류·줌·작업 버튼 유무에 관계없이 검은색 4px 선을 쓴다", () => {
    const map = Object.assign(new Observable(), {
      getSize: () => undefined,
      addLayer: () => {},
      removeLayer: () => {},
    }) as unknown as OpenLayersMap;
    const attachment = attachRegionBoundaryLayer(map, { onViewChange: () => {} });
    const feature = new Feature({ name: "테스트 경계" });
    feature.setId(1);
    for (const kind of [
      undefined,
      "adminDong",
      "legalDong",
      "adminDong",
      "postalCode",
      "sigungu",
    ]) {
      attachment.sync({ type: "FeatureCollection", kind, features: [] });
      for (const withCard of [false, true]) {
        setRegionBoundaryActionIds(attachment.layer, new Set(withCard ? ["1"] : []));
        for (const zoom of [10, 12, 15]) {
          const styles = attachment.layer.getStyleFunction()?.(
            feature,
            156543.03392804097 / 2 ** zoom,
          );
          if (!Array.isArray(styles)) throw new Error("expected boundary styles");
          expect(styles[0].getStroke()?.getColor()).toBe("#000000");
          expect(styles[0].getStroke()?.getWidth()).toBe(4);
        }
      }
    }
    attachment.sync(null);
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
