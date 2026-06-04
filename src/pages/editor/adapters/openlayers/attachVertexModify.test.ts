import Polygon from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import { describe, expect, it } from "vitest";
import type { GeoJsonGeometry } from "@/pages/editor/types/editorTypes";
import {
  hasMoreVertices,
  normalizeClosedRings,
  olGeometryToEditorGeometry,
} from "./attachVertexModify";

describe("normalizeClosedRings", () => {
  it("열린 폴리곤 링의 마지막 좌표를 첫 좌표로 닫는다", () => {
    const open = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
        ],
      ],
    } as GeoJsonGeometry;

    const result = normalizeClosedRings(open);
    expect(result.type).toBe("Polygon");
    if (result.type === "Polygon") {
      const ring = result.coordinates[0];
      expect(ring).toHaveLength(4);
      expect(ring[ring.length - 1]).toEqual(ring[0]);
    }
  });

  it("이미 닫힌 링은 그대로 둔다", () => {
    const closed = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [0, 0],
        ],
      ],
    } as GeoJsonGeometry;

    const result = normalizeClosedRings(closed);
    if (result.type === "Polygon") {
      expect(result.coordinates[0]).toHaveLength(4);
    }
  });

  it("폴리곤이 아니면 그대로 둔다", () => {
    const line = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    } as GeoJsonGeometry;
    expect(normalizeClosedRings(line)).toBe(line);
  });
});

describe("hasMoreVertices", () => {
  const square = () =>
    new Polygon([
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ]);

  it("정점이 늘면 true(정점 추가 제스처)", () => {
    const before = square();
    const after = new Polygon([
      [
        [0, 0],
        [0, 1],
        [0.5, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ]);
    expect(hasMoreVertices(before, after)).toBe(true);
  });

  it("정점 수가 같으면 false(이동 등)", () => {
    expect(hasMoreVertices(square(), square())).toBe(false);
  });
});

describe("olGeometryToEditorGeometry", () => {
  it("OL 폴리곤(3857)을 경위도 GeoJSON으로 변환하고 링을 닫는다", () => {
    const polygon = new Polygon([
      [
        fromLonLat([126.9, 37.5]),
        fromLonLat([126.9, 37.6]),
        fromLonLat([127.0, 37.6]),
        fromLonLat([126.9, 37.5]),
      ],
    ]);

    const result = olGeometryToEditorGeometry(polygon);
    expect(result.type).toBe("Polygon");
    if (result.type === "Polygon") {
      const ring = result.coordinates[0];
      // 닫힘 보장.
      expect(ring[ring.length - 1]).toEqual(ring[0]);
      // 경위도로 복원(근사).
      expect(ring[0][0]).toBeCloseTo(126.9, 5);
      expect(ring[0][1]).toBeCloseTo(37.5, 5);
    }
  });
});
