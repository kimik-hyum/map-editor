import { describe, expect, it, vi } from "vitest";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import { classifyGeometryOverlap } from "./booleanOps";
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
    const measure = vi.fn(classifyGeometryOverlap);
    const cache = createGeometryOverlapCache(measure);
    const a = square(0, 0);
    const b = square(1, 1);
    expect(cache.checkOverlap(a, b)).toBe("overlap");
    for (let i = 0; i < 20; i++) {
      expect(cache.checkOverlap(a, b)).toBe("overlap");
      expect(cache.checkOverlap(b, a)).toBe("overlap");
    }
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("타일 응답/OL 도형 객체가 재생성돼도 정확히 같은 좌표이면 재사용한다", () => {
    const measure = vi.fn(classifyGeometryOverlap);
    const cache = createGeometryOverlapCache(measure);
    expect(cache.checkOverlap(square(0, 0), square(1, 1))).toBe("overlap");
    for (let i = 0; i < 10; i++) {
      expect(cache.checkOverlap(square(0, 0), square(1, 1))).toBe("overlap");
    }
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("면적이 없는 맞닿음(false)도 저장하고 bbox 밖은 정밀 연산하지 않는다", () => {
    const measure = vi.fn(classifyGeometryOverlap);
    const cache = createGeometryOverlapCache(measure);
    expect(cache.checkOverlap(square(0, 0), square(2, 0))).toBe("disjoint");
    expect(cache.checkOverlap(square(0, 0), square(2, 0))).toBe("disjoint");
    expect(cache.checkOverlap(square(0, 0), square(20, 20))).toBe("disjoint");
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("새 경계는 그 쌍만 검사하고 도형 변경/undo에는 현재 좌표에 맞는 판정을 쓴다", () => {
    const measure = vi.fn(classifyGeometryOverlap);
    const cache = createGeometryOverlapCache(measure);
    const a = square(0, 0);
    const b = square(1, 1);
    const c = square(0.5, 0.5);
    expect(cache.checkOverlap(a, b)).toBe("overlap");
    expect(cache.checkOverlap(a, c)).toBe("overlap");
    expect(measure).toHaveBeenCalledTimes(2);

    // 도형은 불변 값: 정점 편집/불리언 연산으로 새 geometry를 전달합니다.
    const edited = square(-1, -1);
    expect(cache.checkOverlap(edited, b)).toBe("disjoint"); // 꼭짓점 접촉
    expect(measure).toHaveBeenCalledTimes(3);
    expect(cache.checkOverlap(a, c)).toBe("overlap"); // 다른 쌍은 그대로
    expect(cache.checkOverlap(a, b)).toBe("overlap"); // undo
    expect(measure).toHaveBeenCalledTimes(3);

    expect(cache.checkOverlap(a, square(2, 0))).toBe("disjoint"); // 경계 새 버전
    expect(measure).toHaveBeenCalledTimes(4);
  });

  it("bbox가 같아도 구멍·미세 좌표 변경을 다른 geometry로 취급한다", () => {
    const measure = vi.fn(classifyGeometryOverlap);
    const cache = createGeometryOverlapCache(measure);
    const outer = square(0, 0, 4);
    const inside = square(1, 1);
    const holed: PolygonalGeometry = {
      type: "Polygon",
      coordinates: [...outer.coordinates, ...inside.coordinates],
    } as PolygonalGeometry;
    expect(cache.checkOverlap(outer, inside)).toBe("overlap");
    expect(cache.checkOverlap(holed, inside)).toBe("disjoint");
    expect(cache.checkOverlap(square(0.0000000001, 0, 4), inside)).toBe("overlap");
    expect(measure).toHaveBeenCalledTimes(3);
  });
});

it("계산 오류는 독립 상태로 재사용하고 새 좌표의 정상 판정을 막지 않는다", () => {
  const measure = vi
    .fn(classifyGeometryOverlap)
    .mockReturnValueOnce("error")
    .mockReturnValue("overlap");
  const cache = createGeometryOverlapCache(measure);
  expect(cache.checkOverlap(square(0, 0), square(1, 1))).toBe("error");
  expect(cache.checkOverlap(square(1, 1), square(0, 0))).toBe("error");
  expect(measure).toHaveBeenCalledTimes(1);
  expect(cache.checkOverlap(square(0, 0), square(1.1, 1))).toBe("overlap");
  expect(measure).toHaveBeenCalledTimes(2);
});

it("빈 bbox를 겹치지 않는 정상 도형으로 분류하지 않는다", () => {
  const cache = createGeometryOverlapCache();
  expect(cache.checkOverlap({ type: "Polygon", coordinates: [] }, square(0, 0))).toBe(
    "error",
  );
});
