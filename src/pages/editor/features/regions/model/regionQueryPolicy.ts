// 운영 중 카탈로그 변경을 다시 읽는 기존 주기는 정책 확정 전까지 유지합니다.
export const REGION_CATALOG_CACHE_MS = 5 * 60_000;

// 월별 경계 도형과 편집용 원본은 세션 내 재방문 때 네트워크 없이 재사용합니다.
export const REGION_BOUNDARY_CACHE_MS = 30 * 60_000;
