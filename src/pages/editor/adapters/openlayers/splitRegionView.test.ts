import { describe, expect, it } from "vitest";
import { splitRegionView } from "./splitRegionView";

const national = {
  zoom: 7,
  minLng: 120.9375,
  minLat: 30.9375,
  maxLng: 135,
  maxLat: 39.375,
  center: [14275749.257106865, 4288447.956652319],
};
describe("splitRegionView", () => {
  it("실측한 2×4의 중앙 행을 먼저 요청하고 전체 bbox를 빈틈 없이 보존한다", () => {
    const tiles = splitRegionView(national, 2, 4);
    expect(tiles).toHaveLength(8);
    expect(tiles[0].minLng).toBe(127.96875);
    expect(tiles[0].minLat).toBeCloseTo(35.26595723847264);
    expect(tiles[1].minLng).toBe(national.minLng);
    expect(tiles[1].minLat).toBe(tiles[0].minLat);
    const levels = [...new Set(tiles.map((tile) => tile.minLat))].sort((a, b) => a - b);
    for (const [index, lat] of levels.entries()) {
      const row = tiles
        .filter((tile) => tile.minLat === lat)
        .sort((a, b) => a.minLng - b.minLng);
      expect(row).toHaveLength(2);
      expect(row[0].minLng).toBe(national.minLng);
      expect(row[0].maxLng).toBe(row[1].minLng);
      expect(row[1].maxLng).toBe(national.maxLng);
      expect(row[0].maxLat).toBe(levels[index + 1] ?? national.maxLat);
      expect(row[1].maxLat).toBe(row[0].maxLat);
    }
    expect(levels[0]).toBe(national.minLat);
    expect(tiles.every((tile) => tile.zoom === 7 && !tile.center)).toBe(true);
  });
  it("단일 요청은 원래 bbox 그대로이며 중심 좌표를 캐시 키에 포함하지 않는다", () => {
    const { center: _center, ...bounds } = national;
    expect(splitRegionView(national, 1, 1)).toEqual([bounds]);
  });
});
