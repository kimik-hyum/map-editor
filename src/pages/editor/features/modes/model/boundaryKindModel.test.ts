import { describe, expect, it } from "vitest";
import {
  createBoundaryKindOptions,
  fallbackBoundaryKindOptions,
} from "./boundaryKindModel";

describe("createBoundaryKindOptions", () => {
  it("서버 카탈로그의 kind·label·순서를 그대로 메뉴로 만든다", () => {
    const options = createBoundaryKindOptions([
      {
        kind: "sigungu",
        label: "시군구",
        level: 1,
        min_zoom: 0,
        sort_order: 0,
        selectable: false,
      },
      {
        kind: "custom",
        label: "사용자 경계",
        level: 4,
        min_zoom: 15,
        sort_order: 9,
        selectable: true,
      },
      {
        kind: "adminDong",
        label: "행정동 서버 라벨",
        level: 2,
        min_zoom: 12,
        sort_order: 1,
        selectable: true,
      },
    ]);

    expect(options.map((option) => option.id)).toEqual(["custom", "adminDong"]);
    expect(options.map((option) => option.label)).toEqual([
      "사용자 경계",
      "행정동 서버 라벨",
    ]);
    expect(options.map((option) => option.description)).toEqual([
      "z15부터 표시",
      "z12부터 표시",
    ]);
  });

  it("서버 조회 실패 때도 최소 KR fallback을 제공한다", () => {
    expect(fallbackBoundaryKindOptions.map((option) => option.id)).toEqual([
      "adminDong",
      "legalDong",
      "postalCode",
    ]);
  });
});
