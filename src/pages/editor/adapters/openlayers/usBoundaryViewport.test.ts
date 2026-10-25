import type OpenLayersMap from "ol/Map";
import { transformExtent } from "ol/proj";
import { describe, expect, it } from "vitest";
import { readUsBoundaryViewports } from "./usBoundaryViewport";

function read(west: number, east: number) {
  const extent = transformExtent([west, 45, east, 60], "EPSG:4326", "EPSG:3857");
  return readUsBoundaryViewports({
    getSize: () => [1200, 800],
    getView: () => ({ calculateExtent: () => extent }),
  } as unknown as OpenLayersMap);
}

describe("미국 경계의 반복 지도 조회 범위", () => {
  it.each([
    [-190, -170],
    [170, 190],
    [530, 550],
  ])("날짜변경선 양쪽을 정규 경도로 나눠 조회한다: %s ~ %s", (west, east) => {
    const boxes = read(west, east);
    expect(boxes?.map(([w, , e]) => [w, e])).toEqual([
      [170, 180],
      [-180, -170],
    ]);
    for (const box of boxes ?? []) {
      expect(box[1]).toBeCloseTo(45);
      expect(box[3]).toBeCloseTo(60);
    }
  });
  it("한 바퀴 이상 이동한 미국 화면도 원래 경도로 조회한다", () => {
    const boxes = read(-435, -433);
    expect(boxes).toHaveLength(1);
    expect(boxes?.[0][0]).toBeCloseTo(-75, 10);
    expect(boxes?.[0][2]).toBeCloseTo(-73, 10);
  });
  it("여러 세계가 보이는 축척은 전 세계 한 번으로 제한한다", () => {
    expect(read(-400, 400)?.map(([w, , e]) => [w, e])).toEqual([[-180, 180]]);
  });
});
