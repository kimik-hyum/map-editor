// 실제 경계 공급자가 연결된 국가만 등록합니다. 국가별 명칭/검색어는 UI와 URL이 공유합니다.
export const boundaryCountries = [
  {
    code: "KR",
    label: "대한민국",
    englishName: "South Korea",
    aliases: "한국 Korea KOR",
    defaultKind: "adminDong",
  },
  {
    code: "US",
    label: "미국",
    englishName: "United States",
    aliases: "America USA",
    defaultKind: "county",
  },
] as const;
export type BoundaryCountry = (typeof boundaryCountries)[number];
export type BoundaryCountryCode = BoundaryCountry["code"];

export function resolveBoundaryCountry(search: string): BoundaryCountry {
  const code = new URLSearchParams(search).get("country")?.trim().toUpperCase();
  return (
    boundaryCountries.find((country) => country.code === code) ?? boundaryCountries[0]
  );
}

export function matchesBoundaryCountry(country: BoundaryCountry, query: string) {
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/);
  const text =
    `${country.code} ${country.label} ${country.englishName} ${country.aliases}`
      .normalize("NFKC")
      .toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}
