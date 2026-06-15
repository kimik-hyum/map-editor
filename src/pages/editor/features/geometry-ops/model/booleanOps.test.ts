import { describe, expect, it } from "vitest";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import {
  hasAreaOverlap,
  overlapAreaSquareMeters,
  subtractGeometry,
  unionGeometries,
} from "./booleanOps";

// 적도 부근 작은 사각형(경도/위도). 면적이 0이 아니어서 겹침 판정에 적합합니다.
function square(x0: number, y0: number, x1: number, y1: number): PolygonalGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  };
}

const A = square(0, 0, 2, 2);
const OVERLAP = square(1, 1, 3, 3); // A의 우상단과 겹침
const DISJOINT = square(10, 10, 12, 12); // A와 완전히 떨어짐
const EDGE_TOUCH = square(2, 0, 4, 2); // A의 오른쪽 변(x=2)만 공유
const COVERS_A = square(-1, -1, 3, 3); // A를 완전히 덮음

describe("unionGeometries", () => {
  it("겹치는 두 폴리곤은 하나의 Polygon으로 합쳐진다", () => {
    const result = unionGeometries(A, OVERLAP);
    expect(result?.type).toBe("Polygon");
  });

  it("떨어진 두 폴리곤은 MultiPolygon이 된다", () => {
    const result = unionGeometries(A, DISJOINT);
    expect(result?.type).toBe("MultiPolygon");
  });
});

describe("subtractGeometry", () => {
  it("겹친 부분을 빼면 남은 면이 Polygon으로 반환된다", () => {
    const result = subtractGeometry(A, OVERLAP);
    expect(result?.type).toBe("Polygon");
  });

  it("cutter가 target을 완전히 덮으면 빈 결과(null)다", () => {
    expect(subtractGeometry(A, COVERS_A)).toBeNull();
  });

  it("Turf 실패는 null(빈 결과)이 아니라 undefined로 구분한다 — 실패가 target 삭제로 둔갑 방지", () => {
    // NaN 좌표 폴리곤은 turf difference가 예외를 던진다(degenerate segment).
    const broken = {
      type: "Polygon",
      coordinates: [
        [
          [Number.NaN, Number.NaN],
          [1, 0],
          [1, 1],
          [Number.NaN, Number.NaN],
        ],
      ],
    } as PolygonalGeometry;
    const result = subtractGeometry(broken, A);
    expect(result).toBeUndefined();
    expect(result).not.toBeNull();
  });

  it("cutter는 그대로 두고 target에서만 뺀다(교집합 면적만큼 줄어듦)", () => {
    const before = overlapAreaSquareMeters(A, A); // A 전체 면적
    const result = subtractGeometry(A, OVERLAP);
    const remaining = result ? overlapAreaSquareMeters(result, result) : 0;
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(before);
  });
});

describe("overlapAreaSquareMeters / hasAreaOverlap", () => {
  it("겹치면 면적이 0보다 크다", () => {
    expect(overlapAreaSquareMeters(A, OVERLAP)).toBeGreaterThan(0);
    expect(hasAreaOverlap(A, OVERLAP)).toBe(true);
  });

  it("완전히 떨어지면 0이다", () => {
    expect(overlapAreaSquareMeters(A, DISJOINT)).toBe(0);
    expect(hasAreaOverlap(A, DISJOINT)).toBe(false);
  });

  it("변끼리 닿기만 하면 겹침으로 보지 않는다(면적 0)", () => {
    expect(overlapAreaSquareMeters(A, EDGE_TOUCH)).toBe(0);
    expect(hasAreaOverlap(A, EDGE_TOUCH)).toBe(false);
  });
});

describe("잘못된 입력 안전성", () => {
  // Zod는 좌표 구조만 검증하므로 빈 ring 같은 기하적 무효 입력이 들어올 수 있다.
  const broken = { type: "Polygon", coordinates: [] } as PolygonalGeometry;

  it("연산이 예외를 던지지 않고 안전한 기본값으로 떨어진다", () => {
    expect(() => unionGeometries(broken, A)).not.toThrow();
    expect(() => subtractGeometry(broken, A)).not.toThrow();
    expect(() => overlapAreaSquareMeters(broken, A)).not.toThrow();
    expect(overlapAreaSquareMeters(broken, A)).toBe(0);
  });
});
