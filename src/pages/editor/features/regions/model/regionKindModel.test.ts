import { describe, expect, it } from "vitest";
import { fallbackRegionKinds, selectSelectableRegionKinds } from "./regionKindModel";

describe("selectSelectableRegionKinds", () => {
  it("비선택 종류를 제외하고 sort_order 순으로 정렬한다", () => {
    const kinds = [
      {
        kind: "custom",
        label: "사용자 경계",
        level: 4,
        min_zoom: 15,
        sort_order: 9,
        selectable: true,
      },
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
        min_zoom: 12,
        sort_order: 1,
        selectable: true,
      },
    ] as const;

    expect(selectSelectableRegionKinds(kinds).map((kind) => kind.kind)).toEqual([
      "adminDong",
      "custom",
    ]);
    expect(kinds.map((kind) => kind.kind)).toEqual(["custom", "sigungu", "adminDong"]);
  });

  it("fallback도 선택 가능한 순서가 고정돼 있다", () => {
    expect(
      selectSelectableRegionKinds(fallbackRegionKinds).map((kind) => kind.kind),
    ).toEqual(["adminDong", "legalDong", "postalCode"]);
  });
});
