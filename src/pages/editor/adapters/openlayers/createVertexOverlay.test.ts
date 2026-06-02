import { describe, expect, it } from "vitest";
import type { GeoJsonGeometry } from "@/pages/editor/types/editorTypes";
import {
  buildProjectedVertices,
  decimateProjectedVertices,
  type ProjectedVertex,
} from "./createVertexOverlay";

// 테스트에서는 투영 없이 경위도를 그대로 x/y로 쓴다(순수 수학만 검증).
const identity = (lon: number, lat: number): [number, number] => [lon, lat];

describe("buildProjectedVertices", () => {
  it("닫힌 폴리곤 링은 중복 닫힘 좌표를 빼고, 첫 정점만 mandatory", () => {
    const geometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 10],
          [10, 10],
          [10, 0],
          [0, 0],
        ],
      ],
    } as GeoJsonGeometry;

    const result = buildProjectedVertices(geometry, identity);

    expect(result).toHaveLength(4);
    expect(result[0].mandatory).toBe(true);
    expect(result.slice(1).every((vertex) => !vertex.mandatory)).toBe(true);
    // 직각 코너라 모든 정점의 turnScore가 0보다 큼.
    expect(result.every((vertex) => vertex.turnScore > 0)).toBe(true);
  });

  it("라인은 양 끝점이 mandatory, 일직선 중간점은 turnScore 0", () => {
    const geometry = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [5, 0],
        [10, 0],
      ],
    } as GeoJsonGeometry;

    const result = buildProjectedVertices(geometry, identity);

    expect(result).toHaveLength(3);
    expect(result[0].mandatory).toBe(true);
    expect(result[2].mandatory).toBe(true);
    expect(result[1].mandatory).toBe(false);
    expect(result[1].turnScore).toBeCloseTo(0);
  });
});

function vertex(
  partial: Partial<ProjectedVertex> & { index: number },
): ProjectedVertex {
  return { x: 0, y: 0, mandatory: false, turnScore: 0, ...partial };
}

describe("decimateProjectedVertices", () => {
  it("같은 셀에서는 turnScore가 큰 정점을 대표로 남긴다", () => {
    const vertices = [
      vertex({ index: 1, x: 1, y: 1, turnScore: 0.2 }),
      vertex({ index: 2, x: 2, y: 2, turnScore: 0.9 }),
    ];
    const result = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(2);
  });

  it("필수점은 항상 유지하고, 같은 셀의 비필수점은 버린다", () => {
    const vertices = [
      vertex({ index: 0, x: 1, y: 1, mandatory: true }),
      vertex({ index: 1, x: 2, y: 2, turnScore: 0.9 }),
    ];
    const result = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
  });

  it("줌아웃(아주 큰 셀)이어도 빈 배열이 아니라 대표점(필수점)이 남는다", () => {
    const vertices = [
      vertex({ index: 0, x: 0, y: 0, mandatory: true }),
      vertex({ index: 1, x: 10, y: 10, turnScore: 0.5 }),
      vertex({ index: 2, x: 20, y: 20, turnScore: 0.7 }),
    ];
    const result = decimateProjectedVertices(vertices, {
      cellSize: 1_000_000,
      maxCount: 100,
    });
    // 한 셀에 다 들어가고 그 셀엔 필수점이 있으므로 필수점만 남는다(빈 배열 아님).
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
  });

  it("상한을 넘으면 셀을 키워 더 솎는다", () => {
    const vertices = [
      vertex({ index: 0, x: 0, y: 0, turnScore: 0.1 }),
      vertex({ index: 1, x: 100, y: 0, turnScore: 0.2 }),
      vertex({ index: 2, x: 0, y: 100, turnScore: 0.3 }),
      vertex({ index: 3, x: 100, y: 100, turnScore: 0.4 }),
    ];
    const all = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 100 });
    expect(all).toHaveLength(4);

    const capped = decimateProjectedVertices(vertices, { cellSize: 10, maxCount: 1 });
    expect(capped).toHaveLength(1);
  });
});
