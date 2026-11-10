import { describe, expect, it } from "vitest";
import { getBoundaryZoomGuide, isBoundaryZoomRangeActive } from "./boundaryZoomGuide";
import { fallbackRegionKinds } from "../../regions/model/regionKindModel";

const view = { minZoom: 0, maxZoom: 28 };

describe("경계 줌 안내", () => {
  it("카탈로그가 없을 때만 한국 기본 기준을 추정값으로 안내한다", () => {
    const guide = getBoundaryZoomGuide({ ...view, country: "KR", kind: "adminDong" });
    expect(guide.estimated).toBe(true);
    expect(guide.ranges).toEqual([
      { kind: "sigungu", label: "시군구", minZoom: 0, maxZoom: 11 },
      { kind: "adminDong", label: "행정동", minZoom: 12, maxZoom: 28 },
    ]);
    expect(isBoundaryZoomRangeActive(guide.ranges[0], 11.99)).toBe(true);
    expect(isBoundaryZoomRangeActive(guide.ranges[1], 11.99)).toBe(false);
    expect(isBoundaryZoomRangeActive(guide.ranges[1], 12)).toBe(true);
  });
  it("선택한 종류의 서버 최소 줌과 이름을 적용한다", () => {
    const catalog = [
      {
        ...fallbackRegionKinds[0],
        kind: "sigungu",
        label: "시군구",
        min_zoom: 0,
        selectable: false,
      },
      { ...fallbackRegionKinds[2], label: "우편 경계", min_zoom: 15 },
    ];
    const guide = getBoundaryZoomGuide({
      ...view,
      country: "KR",
      kind: "postalCode",
      catalog,
    });
    expect(guide.estimated).toBe(false);
    expect(guide.ranges[0].maxZoom).toBe(14);
    expect(guide.ranges[1]).toEqual({
      kind: "postalCode",
      label: "우편 경계",
      minZoom: 15,
      maxZoom: 28,
    });
  });
  it("알 수 없는 서버 상위 종류를 시군구로 단정하지 않는다", () => {
    const guide = getBoundaryZoomGuide({
      ...view,
      country: "KR",
      kind: "adminDong",
      catalog: fallbackRegionKinds,
    });
    expect(guide.ranges[0].kind).toBeNull();
    expect(guide.ranges[0].label).toBe("상위 구역");
  });
  it("서버의 소수 최소 줌을 조회 API와 같은 정수 단계로 해석한다", () => {
    const guide = getBoundaryZoomGuide({
      ...view,
      country: "KR",
      kind: "adminDong",
      catalog: [{ ...fallbackRegionKinds[0], min_zoom: 12.5 }],
    });
    expect(guide.ranges[0].maxZoom).toBe(12);
    expect(guide.ranges[1].minZoom).toBe(13);
  });
  it("지도에서 도달할 수 있는 범위만 표시한다", () => {
    expect(
      getBoundaryZoomGuide({
        minZoom: 14,
        maxZoom: 18,
        country: "KR",
        kind: "adminDong",
      }).ranges,
    ).toEqual([{ kind: "adminDong", label: "행정동", minZoom: 14, maxZoom: 18 }]);
    expect(
      getBoundaryZoomGuide({
        minZoom: 0,
        maxZoom: 10,
        country: "KR",
        kind: "adminDong",
      }).ranges,
    ).toEqual([{ kind: "sigungu", label: "시군구", minZoom: 0, maxZoom: 10 }]);
  });
  it("미국은 선택 종류를 모든 줌에서 유지하며 한국 임계값을 사용하지 않는다", () => {
    for (const [kind, label] of [
      ["county", "카운티"],
      ["state", "주·특별구·영토"],
      ["zcta", "우편번호 통계구역"],
    ]) {
      expect(
        getBoundaryZoomGuide({
          ...view,
          country: "US",
          kind,
          catalog: fallbackRegionKinds,
        }),
      ).toEqual({ estimated: false, ranges: [{ kind, label, ...view }] });
    }
  });
  it("선택이 없거나 알 수 없는 종류에는 표시 구간을 만들지 않는다", () => {
    for (const country of ["KR", "US"] as const) {
      for (const kind of [null, "unknown"]) {
        expect(getBoundaryZoomGuide({ ...view, country, kind }).ranges).toEqual([]);
      }
    }
  });
});
