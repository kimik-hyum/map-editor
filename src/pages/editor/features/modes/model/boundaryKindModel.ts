import { Building2, Layers, MapPinned, type LucideIcon, Mail } from "lucide-react";
import type { RegionKind } from "@/pages/editor/features/regions/api/regionsApi";
import {
  fallbackRegionKinds,
  selectSelectableRegionKinds,
} from "@/pages/editor/features/regions/model/regionKindModel";

export type BoundaryKindOption = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

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
  return selectSelectableRegionKinds(kinds).map((kind) => ({
    id: kind.kind,
    label: kind.label,
    description: `z${kind.min_zoom}부터 표시`,
    icon: iconForKind(kind.kind),
  }));
}

const fallbackDescriptionByKind: Readonly<Record<string, string>> = {
  adminDong: "행정 구역 단위",
  legalDong: "법정 구역 단위",
  postalCode: "우편번호 권역",
};

// 서버 카탈로그를 불러오지 못했을 때만 쓰는 최소 KR fallback입니다.
// 종류·라벨·순서는 regions feature의 공용 fallback을 사용하고, 설명·아이콘만 UI에서 보완합니다.
export const fallbackBoundaryKindOptions: BoundaryKindOption[] =
  createBoundaryKindOptions(fallbackRegionKinds).map((option) => ({
    ...option,
    description: fallbackDescriptionByKind[option.id] ?? option.description,
  }));
