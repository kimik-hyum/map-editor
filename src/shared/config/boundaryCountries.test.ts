import { describe, expect, it } from "vitest";
import {
  boundaryCountries,
  matchesBoundaryCountry,
  resolveBoundaryCountry,
} from "./boundaryCountries";

describe("경계 국가 URL과 검색", () => {
  it.each([
    ["?country=us", "US"],
    ["?country=%20KR%20", "KR"],
    ["?country=JP", "KR"],
    ["?other=US", "KR"],
    ["", "KR"],
  ])("%s의 제공 가능한 초기 국가를 결정한다", (search, code) => {
    expect(resolveBoundaryCountry(search).code).toBe(code);
  });
  it.each(["한국", "대한민국", "south korea", "KOR", "ｋｒ"])(
    "한국 이름/코드 %s로 찾는다",
    (query) => {
      expect(
        boundaryCountries
          .filter((c) => matchesBoundaryCountry(c, query))
          .map((c) => c.code),
      ).toEqual(["KR"]);
    },
  );
  it.each(["미국", "United States", "usa", "US", "America"])(
    "미국 이름/코드 %s로 찾는다",
    (query) => {
      expect(
        boundaryCountries
          .filter((c) => matchesBoundaryCountry(c, query))
          .map((c) => c.code),
      ).toEqual(["US"]);
    },
  );
  it("등록되지 않은 국가나 일치하지 않는 검색은 결과가 없다", () => {
    expect(boundaryCountries.filter((c) => matchesBoundaryCountry(c, "일본"))).toEqual(
      [],
    );
    expect(
      boundaryCountries.filter((c) => matchesBoundaryCountry(c, "korea america")),
    ).toEqual([]);
  });
});
