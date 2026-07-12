import type { RegionKind } from "../api/regionsApi";

// 카탈로그 조회 실패 때도 KR 경계 도구의 최소 기능을 유지하기 위한 기본 목록입니다.
export const fallbackRegionKinds: readonly RegionKind[] = [
  {
    kind: "adminDong",
    label: "행정동",
    level: 2,
    min_zoom: 12,
    sort_order: 0,
    selectable: true,
  },
  {
    kind: "legalDong",
    label: "법정동",
    level: 2,
    min_zoom: 12,
    sort_order: 1,
    selectable: true,
  },
  {
    kind: "postalCode",
    label: "우편번호",
    level: 3,
    min_zoom: 13,
    sort_order: 2,
    selectable: true,
  },
];

// 호출부가 서버 정렬을 빠뜨려도 모든 카탈로그 UI가 같은 순서를 사용합니다.
export function selectSelectableRegionKinds(
  kinds: readonly RegionKind[],
): RegionKind[] {
  return kinds
    .filter((kind) => kind.selectable)
    .sort((a, b) => a.sort_order - b.sort_order);
}
