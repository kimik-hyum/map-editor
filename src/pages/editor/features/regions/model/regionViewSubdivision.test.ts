import { describe, expect, it } from "vitest";
import {
  refineTruncatedRegionViews,
  type RegionViewPart,
} from "./regionViewSubdivision";

const parent: RegionViewPart = {
  depth: 0,
  view: { zoom: 13, minLng: 126.8, minLat: 37.4, maxLng: 127.2, maxLat: 37.8 },
};

describe("refineTruncatedRegionViews", () => {
  it("잘린 bbox만 같은 줌의 4구역으로 빈틈 없이 나누며 나머지 캐시 키를 보존한다", () => {
    const complete = {
      ...parent,
      view: { ...parent.view, minLng: 127.2, maxLng: 127.4 },
    };
    const parts = [parent, complete];
    const result = refineTruncatedRegionViews(parts, [0]);
    expect(result).toHaveLength(5);
    expect(result[4]).toBe(complete);
    const [sw, se, nw, ne] = result.map((part) => part.view);
    expect(sw.minLng).toBe(parent.view.minLng);
    expect(sw.minLat).toBe(parent.view.minLat);
    expect(ne.maxLng).toBe(parent.view.maxLng);
    expect(ne.maxLat).toBe(parent.view.maxLat);
    expect(sw.maxLng).toBe(se.minLng);
    expect(nw.maxLng).toBe(ne.minLng);
    expect(sw.maxLat).toBe(nw.minLat);
    expect(se.maxLat).toBe(ne.minLat);
    expect(result.every((part) => part.view.zoom === 13)).toBe(true);
    expect(refineTruncatedRegionViews(parts, [])).toBe(parts);
  });

  it("계속 잘려도 3단계·64구역을 넘지 않고 부분 표시 상태를 유지한다", () => {
    let parts: readonly RegionViewPart[] = [parent];
    for (let i = 0; i < 3; i++) {
      parts = refineTruncatedRegionViews(
        parts,
        parts.map((_, index) => index),
      );
    }
    expect(parts).toHaveLength(64);
    expect(parts.every((part) => part.depth === 3)).toBe(true);
    expect(
      refineTruncatedRegionViews(
        parts,
        parts.map((_, index) => index),
      ),
    ).toBe(parts);
    const manyRoots = Array.from({ length: 8 }, () => parent);
    const once = refineTruncatedRegionViews(
      manyRoots,
      manyRoots.map((_, i) => i),
    );
    const twice = refineTruncatedRegionViews(
      once,
      once.map((_, i) => i),
    );
    expect(twice.length).toBeLessThanOrEqual(64);
  });
});
