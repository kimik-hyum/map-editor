import { describe, expect, it } from "vitest";
import { getBoundaryZoomGuide, isBoundaryZoomRangeActive } from "./boundaryZoomGuide";
import type { RegionKind } from "../../regions/api/regionsApi";

const view = { minZoom: 0, maxZoom: 28 };
const catalog: RegionKind[] = [
  {
    kind: "sigungu",
    label: "시군구",
    level: 1,
    min_zoom: 0,
    sort_order: 0,
    selectable: false,
  },
  {
    kind: "adminDong",
    label: "행정동",
    level: 2,
    min_zoom: 15,
    sort_order: 1,
    selectable: true,
  },
  {
    kind: "legalDong",
    label: "법정동",
    level: 3,
    min_zoom: 12,
    sort_order: 2,
    selectable: true,
  },
];

describe("경계 줌 안내", () => {
  it("카탈로그를 확인하지 못하면 임의의 전환 기준을 표시하지 않는다", () => {
    expect(getBoundaryZoomGuide({ ...view, country: "KR", kind: "adminDong" })).toEqual(
      {
        estimated: true,
        ranges: [],
        transitionZoom: null,
      },
    );
  });
  it("행정동과 법정동에 각각 서버의 최소 줌과 이름을 적용한다", () => {
    for (const [kind, label, threshold] of [
      ["adminDong", "행정동", 15],
      ["legalDong", "법정동", 12],
    ] as const) {
      const guide = getBoundaryZoomGuide({ ...view, country: "KR", kind, catalog });
      expect(guide.estimated).toBe(false);
      expect(guide.transitionZoom).toBe(threshold);
      expect(guide.ranges).toEqual([
        { kind: "sigungu", label: "시군구", minZoom: 0, maxZoom: threshold - 1 },
        { kind, label, minZoom: threshold, maxZoom: 28 },
      ]);
      expect(isBoundaryZoomRangeActive(guide.ranges[0], threshold - 0.01)).toBe(true);
      expect(isBoundaryZoomRangeActive(guide.ranges[1], threshold - 0.01)).toBe(false);
      expect(isBoundaryZoomRangeActive(guide.ranges[1], threshold)).toBe(true);
    }
  });
  it("알 수 없는 서버 상위 종류를 시군구로 단정하지 않는다", () => {
    const guide = getBoundaryZoomGuide({
      ...view,
      country: "KR",
      kind: "adminDong",
      catalog: catalog.slice(1),
    });
    expect(guide.ranges[0].kind).toBeNull();
    expect(guide.ranges[0].label).toBe("상위 구역");
  });
  it("서버의 소수 최소 줌을 조회 API와 같은 정수 단계로 해석한다", () => {
    const guide = getBoundaryZoomGuide({
      ...view,
      country: "KR",
      kind: "adminDong",
      catalog: [{ ...catalog[1], min_zoom: 12.5 }],
    });
    expect(guide.transitionZoom).toBe(13);
    expect(guide.ranges[0].maxZoom).toBe(12);
    expect(guide.ranges[1].minZoom).toBe(13);
  });
  it("지도에서 도달할 수 있는 범위만 표시한다", () => {
    expect(
      getBoundaryZoomGuide({
        minZoom: 14,
        maxZoom: 18,
        country: "KR",
        kind: "legalDong",
        catalog,
      }).ranges,
    ).toEqual([{ kind: "legalDong", label: "법정동", minZoom: 14, maxZoom: 18 }]);
    expect(
      getBoundaryZoomGuide({
        minZoom: 0,
        maxZoom: 10,
        country: "KR",
        kind: "legalDong",
        catalog,
      }).ranges,
    ).toEqual([{ kind: "sigungu", label: "시군구", minZoom: 0, maxZoom: 10 }]);
  });
  it("미국은 선택 종류를 모든 줌에서 유지하며 한국 임계값을 사용하지 않는다", () => {
    for (const [kind, label] of [
      ["county", "카운티"],
      ["state", "주·특별구·영토"],
      ["zcta", "우편번호 통계구역"],
    ]) {
      expect(getBoundaryZoomGuide({ ...view, country: "US", kind, catalog })).toEqual({
        estimated: false,
        ranges: [{ kind, label, ...view }],
        transitionZoom: null,
      });
    }
  });
  it("선택이 없거나 알 수 없는 종류에는 표시 구간을 만들지 않는다", () => {
    for (const country of ["KR", "US"] as const) {
      for (const kind of [null, "unknown"]) {
        expect(
          getBoundaryZoomGuide({ ...view, country, kind, catalog }).ranges,
        ).toEqual([]);
      }
    }
  });
});
