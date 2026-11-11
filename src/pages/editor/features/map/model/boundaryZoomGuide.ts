import type { BoundaryCountryCode } from "@/shared/config/boundaryCountries";
import type { RegionKind } from "../../regions/api/regionsApi";
import { usKindLabels } from "../../us-boundaries/model/usBoundaryModel";

export type BoundaryZoomRange = {
  kind: string | null;
  label: string;
  minZoom: number;
  maxZoom: number;
};

export function getBoundaryZoomGuide({
  country,
  kind,
  catalog,
  minZoom,
  maxZoom,
}: {
  country: BoundaryCountryCode;
  kind: string | null;
  catalog?: readonly RegionKind[];
  minZoom: number;
  maxZoom: number;
}) {
  const ranges: BoundaryZoomRange[] = [];
  const estimated = country === "KR" && catalog === undefined;
  if (country === "US") {
    const label = Object.entries(usKindLabels).find(([id]) => id === kind)?.[1];
    if (label) ranges.push({ kind, label, minZoom, maxZoom });
    return { ranges, estimated, transitionZoom: null };
  }

  // 메뉴용 기본 종류는 실제 서버의 줌 정책을 보증하지 않습니다.
  // 카탈로그 조회 전/실패 시에는 정확한 전환 단계처럼 표시하지 않습니다.
  if (!catalog) return { ranges, estimated, transitionZoom: null };
  const kinds = catalog;
  const selected = kinds.find((entry) => entry.kind === kind);
  if (!selected) return { ranges, estimated, transitionZoom: null };
  // 경계 API는 floor(zoom)을 사용하므로 소수 최소 줌도 다음 정수 단계부터 적용합니다.
  const threshold = Math.ceil(selected.min_zoom);
  const overview = kinds.find((entry) => entry.kind === "sigungu");
  if (minZoom < threshold) {
    ranges.push({
      kind: overview?.kind ?? null,
      label: overview?.label ?? "상위 구역",
      minZoom,
      maxZoom: Math.min(maxZoom, threshold - 1),
    });
  }
  if (maxZoom >= threshold) {
    ranges.push({
      kind: selected.kind,
      label: selected.label,
      minZoom: Math.max(minZoom, threshold),
      maxZoom,
    });
  }
  return { ranges, estimated, transitionZoom: threshold };
}

export function isBoundaryZoomRangeActive(range: BoundaryZoomRange, zoom: number) {
  const level = Math.floor(zoom);
  return level >= range.minZoom && level <= range.maxZoom;
}
