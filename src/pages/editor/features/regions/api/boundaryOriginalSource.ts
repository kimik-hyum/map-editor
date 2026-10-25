import { t } from "@/shared/i18n/i18n";
import { normalizePolygonalGeometry } from "../../geometry-ops";
import {
  isPolygonalGeometry,
  type GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";

// 공급자는 원본 조회/캐시를, 경계 작업은 원본 우선 선택과 편집 적용을 담당합니다.
export type BoundaryOriginalSource = {
  scope: string;
  getCachedGeometry: (id: string | number) => GeoJsonGeometry | undefined;
  fetchGeometry: (id: string | number, signal: AbortSignal) => Promise<GeoJsonGeometry>;
};

export async function fetchBoundaryOperationGeometry(
  source: BoundaryOriginalSource,
  id: string | number,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const geometry = await source.fetchGeometry(id, signal);
  signal.throwIfAborted();
  const normalized = isPolygonalGeometry(geometry)
    ? normalizePolygonalGeometry(geometry)
    : null;
  if (!normalized) {
    throw new Error(t("경계 원본의 좌표가 올바르지 않아 적용할 수 없습니다."));
  }
  return normalized;
}
