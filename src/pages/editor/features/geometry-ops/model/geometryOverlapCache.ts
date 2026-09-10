import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import { bboxesOverlap, geometryBbox, hasAreaOverlap } from "./booleanOps";

type OverlapCheck = (a: PolygonalGeometry, b: PolygonalGeometry) => boolean;
type GeometryEntry = {
  bounds: ReturnType<typeof geometryBbox>;
  overlaps: WeakMap<GeometryEntry, boolean>;
};

// 타일 재조회/OL 재생성으로 객체만 바뀌어도 같은 좌표의 판정을 재사용합니다.
// 좌표를 반올림하거나 해시로 축약하지 않아 경계 버전·정밀도 변경을 놓치지 않습니다.
// 최근 좌표 키만 강하게 보관하고, 도형/판정 간 참조는 WeakMap으로 수명을 제한합니다.
const MAX_RECENT_GEOMETRIES = 256;

export function createGeometryOverlapCache(
  checkOverlap: OverlapCheck = hasAreaOverlap,
) {
  const byReference = new WeakMap<PolygonalGeometry, GeometryEntry>();
  const byCoordinates = new Map<string, GeometryEntry>();

  const entryFor = (geometry: PolygonalGeometry): GeometryEntry => {
    const known = byReference.get(geometry);
    if (known) return known;

    const key = JSON.stringify([geometry.type, geometry.coordinates]);
    let entry = byCoordinates.get(key);
    if (!entry) {
      entry = { bounds: geometryBbox(geometry), overlaps: new WeakMap() };
    }
    byCoordinates.delete(key);
    byCoordinates.set(key, entry);
    if (byCoordinates.size > MAX_RECENT_GEOMETRIES) {
      const oldest = byCoordinates.keys().next().value;
      if (oldest !== undefined) byCoordinates.delete(oldest);
    }
    byReference.set(geometry, entry);
    return entry;
  };

  return {
    // scene/응답 geometry는 불변 값입니다. 편집·undo·새 응답은 새 객체를 전달합니다.
    // 선택, 버튼 순서/위치, 줌, 로딩 상태는 캐시 키에 포함하지 않습니다.
    hasOverlap(a: PolygonalGeometry, b: PolygonalGeometry): boolean {
      const left = entryFor(a);
      const right = entryFor(b);
      const known = left.overlaps.get(right);
      if (known !== undefined) return known;

      const result = bboxesOverlap(left.bounds, right.bounds) && checkOverlap(a, b);
      left.overlaps.set(right, result);
      right.overlaps.set(left, result);
      return result;
    },
  };
}
