import { describe, expect, it } from "vitest";
import { selectFixedRegionTiles, usesRegionTileCache } from "./fixedRegionTiles";
import type { RegionTileManifest } from "../api/regionsApi";
import { mergeRegionCollections } from "./mergeRegionCollections";
const version = `12345678-1234-1234-1234-123456789012.${"a".repeat(32)}`;
const manifest: RegionTileManifest = {
  country: "KR",
  version,
  profile: "sigungu-4x-full-v1",
  kind: "sigungu",
  maxDisplayZoom: 10,
  minTileZoom: 6,
  maxTileZoom: 9,
  tiles: [
    { z: 7, x: 108, y: 49 },
    { z: 7, x: 109, y: 49 },
    { z: 7, x: 108, y: 50 },
    { z: 7, x: 109, y: 50 },
    { z: 9, x: 436, y: 198 },
  ],
};
const view = {
  zoom: 8,
  minLng: 125.15625,
  minLat: 35.15625,
  maxLng: 129.375,
  maxLat: 39.375,
};
describe("fixed region tiles", () => {
  it("줌10까지 캐시하고 11부터는 기존 bbox로 분기한다", () => {
    expect([0, 7, 8, 9, 10].every(usesRegionTileCache)).toBe(true);
    expect([11, 12, 22, -1, 10.5, NaN].some(usesRegionTileCache)).toBe(false);
    expect(selectFixedRegionTiles({ ...view, zoom: 11 }, manifest)).toEqual([]);
  });
  it("viewport 크기가 달라도 동일한 고정 키를 재사용한다", () => {
    expect(selectFixedRegionTiles(view, manifest)).toHaveLength(4);
    expect(
      selectFixedRegionTiles({ ...view, minLng: 125.3, maxLng: 129.2 }, manifest),
    ).toEqual(selectFixedRegionTiles(view, manifest));
    expect(
      selectFixedRegionTiles(
        { ...view, minLng: 0, maxLng: 1, minLat: 0, maxLat: 1 },
        manifest,
      ),
    ).toEqual([]);
  });
  it("512 상당 격자와 coverage manifest를 사용하고 중복 셀을 제거한다", () => {
    expect(
      selectFixedRegionTiles(view, {
        ...manifest,
        tiles: [...manifest.tiles, ...manifest.tiles],
      }),
    ).toHaveLength(4);
    expect(selectFixedRegionTiles({ ...view, zoom: 10 }, manifest)).toEqual([
      { z: 9, x: 436, y: 198 },
    ]);
  });
  it("타일 버전이 다른 응답은 화면에 섞지 않는다", () => {
    const data = {
      type: "FeatureCollection" as const,
      country: "KR",
      kind: "sigungu",
      level: 1,
      truncated: false,
      features: [],
      cache: {
        version,
        profile: "sigungu-4x-full-v1" as const,
        z: 7,
        x: 108,
        y: 49,
        status: "HIT" as const,
      },
    };
    expect(() =>
      mergeRegionCollections([
        data,
        { ...data, cache: { ...data.cache, version: version.replace(/a/g, "b") } },
      ]),
    ).toThrow();
    expect(mergeRegionCollections([data, data])?.features).toEqual([]);
  });
});
