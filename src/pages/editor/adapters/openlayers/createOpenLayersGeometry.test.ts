import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";
import MultiPoint from "ol/geom/MultiPoint";
import Point from "ol/geom/Point";
import { toLonLat } from "ol/proj";
import { describe, expect, it } from "vitest";
import { createOpenLayersGeometry } from "./createOpenLayersGeometry";

describe("createOpenLayersGeometry", () => {
  it("Point와 MultiPoint를 지도 투영 geometry로 변환한다", () => {
    const point = createOpenLayersGeometry({
      type: "Point",
      coordinates: [126.9, 37.5],
    });
    expect(point).toBeInstanceOf(Point);
    expect(toLonLat((point as Point).getCoordinates())[0]).toBeCloseTo(126.9, 5);

    const multiPoint = createOpenLayersGeometry({
      type: "MultiPoint",
      coordinates: [
        [126.9, 37.5],
        [127, 37.6],
      ],
    });
    expect(multiPoint).toBeInstanceOf(MultiPoint);
    expect((multiPoint as MultiPoint).getCoordinates()).toHaveLength(2);
  });

  it("LineString과 MultiLineString을 지도 투영 geometry로 변환한다", () => {
    const line = createOpenLayersGeometry({
      type: "LineString",
      coordinates: [
        [126.9, 37.5],
        [127, 37.6],
      ],
    });
    expect(line).toBeInstanceOf(LineString);
    expect((line as LineString).getCoordinates()).toHaveLength(2);

    const multiLine = createOpenLayersGeometry({
      type: "MultiLineString",
      coordinates: [
        [
          [126.9, 37.5],
          [127, 37.6],
        ],
      ],
    });
    expect(multiLine).toBeInstanceOf(MultiLineString);
    expect((multiLine as MultiLineString).getCoordinates()).toHaveLength(1);
  });
});
