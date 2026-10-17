import { describe, expect, it } from "vitest";
import { US_BOUNDARY_VERSION } from "@/shared/config/usBoundaries";
import {
  intersectsUsBbox,
  planUsBoundaryView,
  US_MAX_BYTES,
  US_MAX_FEATURES,
  type UsIndex,
} from "./usBoundaryModel";

const key = "z15-plus/county/0001.json";
const catalog = {
  kind: "county" as const,
  label: "County",
  features: 2,
  index: "indexes/county.json",
  shards: [{ key, bytes: 100, features: 2 }],
};
const index: UsIndex = {
  version: US_BOUNDARY_VERSION,
  country: "US",
  kind: "county",
  items: [
    { id: "ny", bbox: [-74.1, 40.6, -73.8, 40.9], object: key },
    {
      id: "sf",
      bbox: [-122.6, 37.6, -122.3, 37.9],
      object: "z15-plus/county/0002.json",
    },
  ],
};
describe("미국 경계 화면 조회 계획", () => {
  it("화면의 피처가 든 파일만 선택하고 동일 파일을 중복 요청하지 않는다", () => {
    const result = planUsBoundaryView(index, catalog, [-75, 40, -73, 42]);
    expect([...result.ids]).toEqual(["ny"]);
    expect(result.shards.map((s) => s.key)).toEqual([key]);
    expect(planUsBoundaryView(index, catalog, [126, 36, 128, 38]).shards).toEqual([]);
  });
  it("화면 끝과 맞닿은 경계도 포함한다", () => {
    expect(intersectsUsBbox([-74, 40, -73, 41], [-73, 41, -72, 42])).toBe(true);
  });
  it("전국 세부 경계와 용량 과다 조회는 다운로드 전에 거절한다", () => {
    const tooMany = {
      ...index,
      items: Array.from({ length: US_MAX_FEATURES + 1 }, (_, i) => ({
        ...index.items[0],
        id: String(i),
      })),
    };
    expect(() => planUsBoundaryView(tooMany, catalog, [-75, 40, -73, 42])).toThrow(
      "확대",
    );
    expect(() =>
      planUsBoundaryView(
        index,
        { ...catalog, shards: [{ key, bytes: US_MAX_BYTES + 1, features: 1 }] },
        [-75, 40, -73, 42],
      ),
    ).toThrow("확대");
  });
  it("누락된 파일과 다른 종류의 인덱스를 조용히 부분 성공으로 처리하지 않는다", () => {
    expect(() => planUsBoundaryView(index, catalog, [-123, 37, -122, 38])).toThrow(
      "목록",
    );
    expect(() =>
      planUsBoundaryView({ ...index, kind: "place" }, catalog, [-75, 40, -73, 42]),
    ).toThrow("종류");
  });
});
