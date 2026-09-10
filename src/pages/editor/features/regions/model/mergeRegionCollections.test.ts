import { describe, expect, it } from "vitest";
import type { RegionFeatureCollection } from "../api/regionsApi";
import { mergeRegionCollections } from "./mergeRegionCollections";

function collection(
  ids: Array<number | string>,
  truncated = false,
): RegionFeatureCollection {
  return {
    type: "FeatureCollection",
    country: "KR",
    kind: "sigungu",
    level: 1,
    truncated,
    features: ids.map((id) => ({
      type: "Feature",
      id,
      properties: { name: String(id) },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    })),
  };
}
describe("mergeRegionCollections", () => {
  it("첫 부분 응답을 즉시 사용하고 숫자/문자 행 ID 중복을 제거한다", () => {
    const first = collection([1, 2]);
    expect(mergeRegionCollections([first])?.features).toEqual(first.features);
    const combined = mergeRegionCollections([first, collection(["1", 3], true)]);
    expect(combined?.features.map((f) => f.id)).toEqual([1, 2, 3]);
    expect(combined?.features[0]).toBe(first.features[0]);
    expect(combined?.truncated).toBe(true);
    expect(first.features).toHaveLength(2);
  });
  it("아직 받은 응답 없음과 성공한 빈 바다 조각을 구분한다", () => {
    expect(mergeRegionCollections([])).toBeNull();
    expect(mergeRegionCollections([collection([])])?.features).toEqual([]);
  });
  it.each(["country", "kind", "level"] as const)(
    "서로 다른 %s 응답을 섞지 않는다",
    (key) => {
      const changed = { ...collection([2]), [key]: key === "level" ? 2 : "other" };
      expect(() => mergeRegionCollections([collection([1]), changed])).toThrow(
        "일치하지",
      );
    },
  );
});
