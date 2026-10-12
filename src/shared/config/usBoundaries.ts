// 배포한 표시용 버전을 고정해 브라우저 캐시와 원본 데이터를 분리합니다.
export const US_BOUNDARY_ORIGINAL_VERSION = "2026-wgs84-05ad9b581f5cdfdc";
export const US_BOUNDARY_VERSION = "2026-wgs84-05ad9b581f5cdfdc-display-15c6c815210f";
export const US_BOUNDARY_KINDS = [
  "state",
  "county",
  "county_subdivision",
  "place",
  "zcta",
] as const;

export function isUsBoundaryObject(key: string): boolean {
  if (key === "manifest.json") return true;
  return US_BOUNDARY_KINDS.some(
    (kind) =>
      key === `indexes/${kind}.json` ||
      new RegExp(`^z15-plus/${kind}/[0-9]{4}\\.json$`).test(key),
  );
}

export function usBoundaryObjectUrl(key: string): string {
  return `/api/us-boundaries?${new URLSearchParams({
    version: US_BOUNDARY_VERSION,
    file: key,
  })}`;
}

export function isUsBoundaryOriginalObject(key: string): boolean {
  return US_BOUNDARY_KINDS.some((kind) =>
    new RegExp(`^originals/${kind}/[0-9]{4}\\.json$`).test(key),
  );
}

export function usBoundaryOriginalUrl(key: string): string {
  return `/api/us-boundaries?${new URLSearchParams({
    version: US_BOUNDARY_ORIGINAL_VERSION,
    file: key,
  })}`;
}
