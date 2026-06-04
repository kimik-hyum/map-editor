import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import { describe, expect, it } from "vitest";
import { nearestEdgeDistance, nearestVertexDistance } from "./geometryDistance";

describe("nearestVertexDistance", () => {
  const line = () =>
    new LineString([
      [0, 0],
      [10, 0],
    ]);

  it("가장 가까운 정점까지의 거리를 반환한다", () => {
    expect(nearestVertexDistance([line()], [1, 0])).toBeCloseTo(1);
    expect(nearestVertexDistance([line()], [9, 1])).toBeCloseTo(Math.SQRT2);
  });

  it("stride(3D, XYZ)를 반영해 정점만 순회한다", () => {
    const line3d = new LineString(
      [
        [0, 0, 5],
        [10, 0, 5],
      ],
      "XYZ",
    );
    expect(line3d.getStride()).toBe(3);
    expect(nearestVertexDistance([line3d], [1, 0])).toBeCloseTo(1);
  });

  it("여러 geometry 중 최소 거리를 고른다", () => {
    const far = new LineString([
      [100, 100],
      [110, 100],
    ]);
    expect(nearestVertexDistance([far, line()], [0, 0])).toBeCloseTo(0);
  });

  it("정점이 없으면 +Infinity", () => {
    expect(nearestVertexDistance([], [0, 0])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("nearestEdgeDistance", () => {
  const square = () =>
    new Polygon([
      [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ],
    ]);

  it("외곽선(경계)까지의 최단 거리를 반환한다", () => {
    // 내부 점 [2,5]에서 가장 가까운 경계는 x=0 변 → 거리 2.
    expect(nearestEdgeDistance([square()], [2, 5])).toBeCloseTo(2);
  });

  it("경계 위의 점은 거리 0", () => {
    expect(nearestEdgeDistance([square()], [0, 5])).toBeCloseTo(0);
  });

  it("geometry가 없으면 +Infinity", () => {
    expect(nearestEdgeDistance([], [0, 0])).toBe(Number.POSITIVE_INFINITY);
  });
});
