import { Building2, Layers, MapPinned, type LucideIcon, Mail } from "lucide-react";
import type { RegionKind } from "@/pages/editor/features/regions/api/regionsApi";

export type BoundaryKindOption = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

// 서버 카탈로그를 불러오지 못했을 때만 쓰는 최소 KR fallback입니다.
// 정상 경로의 메뉴 종류·라벨·순서는 region_kind가 단일 출처입니다.
export const fallbackBoundaryKindOptions: BoundaryKindOption[] = [
  {
    id: "adminDong",
    label: "행정동",
    description: "행정 구역 단위",
    icon: Building2,
  },
  {
    id: "legalDong",
    label: "법정동",
    description: "법정 구역 단위",
    icon: Layers,
  },
  {
    id: "postalCode",
    label: "우편번호",
    description: "우편번호 권역",
    icon: Mail,
  },
];

function iconForKind(kind: string): LucideIcon {
  if (kind === "adminDong") {
    return Building2;
  }
  if (kind === "legalDong") {
    return Layers;
  }
  if (kind === "postalCode") {
    return Mail;
  }
  return MapPinned;
}

// 종류·라벨·정렬은 서버 region_kind를 그대로 사용하고, 아이콘만 UI 표현 규칙으로 보완합니다.
export function createBoundaryKindOptions(
  kinds: readonly RegionKind[],
): BoundaryKindOption[] {
  return kinds
    .filter((kind) => kind.selectable)
    .map((kind) => ({
      id: kind.kind,
      label: kind.label,
      description: `z${kind.min_zoom}부터 표시`,
      icon: iconForKind(kind.kind),
    }));
}
