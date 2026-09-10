import { describe, expect, it, vi } from "vitest";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import { hasAreaOverlap } from "./booleanOps";
import { createGeometryOverlapCache } from "./geometryOverlapCache";

function square(x: number, y: number, size = 2): PolygonalGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + size, y],
        [x + size, y + size],
        [x, y + size],
        [x, y],
      ],
    ],
  };
}

describe("createGeometryOverlapCache", () => {
  it("팬/줌/버튼 재정렬과 선택 복귀에서 같은 쌍을 다시 계산하지 않는다", () => {
    const measure = vi.fn(hasAreaOverlap);
    const cache = createGeometryOverlapCache(measure);
    const a = square(0, 0);
    const b = square(1, 1);
    expect(cache.hasOverlap(a, b)).toBe(true);
    for (let i = 0; i < 20; i++) {
      expect(cache.hasOverlap(a, b)).toBe(true);
      expect(cache.hasOverlap(b, a)).toBe(true);
    }
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("타일 응답/OL 도형 객체가 재생성돼도 정확히 같은 좌표이면 재사용한다", () => {
    const measure = vi.fn(hasAreaOverlap);
    const cache = createGeometryOverlapCache(measure);
    expect(cache.hasOverlap(square(0, 0), square(1, 1))).toBe(true);
    for (let i = 0; i < 10; i++) {
      expect(cache.hasOverlap(square(0, 0), square(1, 1))).toBe(true);
    }
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("면적이 없는 맞닿음(false)도 저장하고 bbox 밖은 정밀 연산하지 않는다", () => {
    const measure = vi.fn(hasAreaOverlap);
    const cache = createGeometryOverlapCache(measure);
    expect(cache.hasOverlap(square(0, 0), square(2, 0))).toBe(false);
    expect(cache.hasOverlap(square(0, 0), square(2, 0))).toBe(false);
    expect(cache.hasOverlap(square(0, 0), square(20, 20))).toBe(false);
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("새 경계는 그 쌍만 검사하고 도형 변경/undo에는 현재 좌표에 맞는 판정을 쓴다", () => {
    const measure = vi.fn(hasAreaOverlap);
    const cache = createGeometryOverlapCache(measure);
    const a = square(0, 0);
    const b = square(1, 1);
    const c = square(0.5, 0.5);
    expect(cache.hasOverlap(a, b)).toBe(true);
    expect(cache.hasOverlap(a, c)).toBe(true);
    expect(measure).toHaveBeenCalledTimes(2);

    // 도형은 불변 값: 정점 편집/불리언 연산으로 새 geometry를 전달합니다.
    const edited = square(-1, -1);
    expect(cache.hasOverlap(edited, b)).toBe(false); // 꼭짓점 접촉
    expect(measure).toHaveBeenCalledTimes(3);
    expect(cache.hasOverlap(a, c)).toBe(true); // 다른 쌍은 그대로
    expect(cache.hasOverlap(a, b)).toBe(true); // undo
    expect(measure).toHaveBeenCalledTimes(3);

    expect(cache.hasOverlap(a, square(2, 0))).toBe(false); // 경계 새 버전
    expect(measure).toHaveBeenCalledTimes(4);
  });

  it("bbox가 같아도 구멍·미세 좌표 변경을 다른 geometry로 취급한다", () => {
    const measure = vi.fn(hasAreaOverlap);
    const cache = createGeometryOverlapCache(measure);
    const outer = square(0, 0, 4);
    const inside = square(1, 1);
    const holed: PolygonalGeometry = {
      type: "Polygon",
      coordinates: [...outer.coordinates, ...inside.coordinates],
    } as PolygonalGeometry;
    expect(cache.hasOverlap(outer, inside)).toBe(true);
    expect(cache.hasOverlap(holed, inside)).toBe(false);
    expect(cache.hasOverlap(square(0.0000000001, 0, 4), inside)).toBe(true);
    expect(measure).toHaveBeenCalledTimes(3);
  });
});
