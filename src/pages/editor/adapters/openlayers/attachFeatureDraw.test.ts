import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { describe, expect, it } from "vitest";
import { GeometryKind } from "@/pages/editor/types/editorTypes";
import {
  canFinishDraw,
  confirmedDrawVertexCount,
  drawGeometryTypeForShape,
  isWithinPixelTolerance,
  shouldFinishFromPointer,
} from "./attachFeatureDraw";

describe("drawGeometryTypeForShape", () => {
  it("에디터 도형 종류를 OpenLayers Draw 타입으로 매핑한다", () => {
    expect(drawGeometryTypeForShape(GeometryKind.Polygon)).toBe("Polygon");
    expect(drawGeometryTypeForShape(GeometryKind.Path)).toBe("LineString");
    expect(drawGeometryTypeForShape(GeometryKind.Point)).toBe("Point");
  });
});

describe("confirmedDrawVertexCount", () => {
  it("커서 추적용 마지막 좌표를 빼고 확정 정점만 센다", () => {
    expect(confirmedDrawVertexCount(new Point([0, 0]))).toBe(1);
    expect(
      confirmedDrawVertexCount(
        new LineString([
          [0, 0],
          [1, 1],
          [1, 1],
        ]),
      ),
    ).toBe(2);
    expect(
      confirmedDrawVertexCount(
        new Polygon([
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [1, 1],
          ],
        ]),
      ),
    ).toBe(3);
  });
});

describe("canFinishDraw", () => {
  it("Path만 확정 정점 2개부터 버튼 완료할 수 있다", () => {
    expect(canFinishDraw(GeometryKind.Path, 1)).toBe(false);
    expect(canFinishDraw(GeometryKind.Path, 2)).toBe(true);
    expect(canFinishDraw(GeometryKind.Polygon, 3)).toBe(false);
    expect(canFinishDraw(GeometryKind.Point, 1)).toBe(false);
  });
});

describe("isWithinPixelTolerance", () => {
  it("시작점 허용 반경 안에서만 폴리곤 닫힘으로 판정한다", () => {
    expect(isWithinPixelTolerance([10, 10], [16, 18], 10)).toBe(true);
    expect(isWithinPixelTolerance([10, 10], [21, 10], 10)).toBe(false);
  });
});

describe("shouldFinishFromPointer", () => {
  it("Point는 즉시, Path는 버튼으로, Polygon은 시작점에서만 끝낸다", () => {
    expect(shouldFinishFromPointer(GeometryKind.Point, 1, false)).toBe(true);
    expect(shouldFinishFromPointer(GeometryKind.Path, 3, true)).toBe(false);
    expect(shouldFinishFromPointer(GeometryKind.Polygon, 2, true)).toBe(false);
    expect(shouldFinishFromPointer(GeometryKind.Polygon, 3, false)).toBe(false);
    expect(shouldFinishFromPointer(GeometryKind.Polygon, 3, true)).toBe(true);
  });
});
