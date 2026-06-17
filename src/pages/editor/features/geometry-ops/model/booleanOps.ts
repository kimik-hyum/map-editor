import area from "@turf/area";
import bbox from "@turf/bbox";
import difference from "@turf/difference";
import { feature as toFeature, featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import union from "@turf/union";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";

// React/OpenLayers를 모르는 순수 Turf 연산 모음입니다(단위 테스트 우선 대상).
// 입력 geometry는 EPSG:4326(경도/위도)이라 Turf가 추가 투영 없이 그대로 다룹니다.

type TurfPolygonFeature = Feature<Polygon | MultiPolygon>;

// 내부 PolygonalGeometry ↔ Turf(geojson) 경계 변환입니다.
// 좌표는 2D로 동일해 구조적으로 호환되며, 되돌아올 때만 좁은 EditorCoordinate 튜플로 캐스팅합니다
// (Turf는 2D 입력에 2D 출력을 보장).
function toTurf(geometry: PolygonalGeometry): TurfPolygonFeature {
  return toFeature(geometry as Polygon | MultiPolygon);
}

function fromTurf(result: TurfPolygonFeature | null): PolygonalGeometry | null {
  if (!result?.geometry) {
    return null;
  }
  return result.geometry as PolygonalGeometry;
}

// 입력 Zod는 좌표 "구조"만 검증하므로(자가 교차·불완전 ring 등 기하 유효성은 보장 X),
// 잘못된 폴리곤에서 Turf가 던질 수 있습니다. 후보 도출은 렌더 effect 안에서 실행되니,
// 한 도형의 오류가 전체를 무너뜨리지 않도록 연산을 감싸 안전한 기본값으로 떨어뜨립니다.
function safeTurf<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

// 두 폴리곤을 합칩니다. 붙어 있으면 하나의 Polygon, 떨어져 있으면 MultiPolygon이 됩니다.
// 합칠 게 없거나 연산이 실패하면 null입니다.
export function unionGeometries(
  a: PolygonalGeometry,
  b: PolygonalGeometry,
): PolygonalGeometry | null {
  return fromTurf(
    safeTurf(() => union(featureCollection([toTurf(a), toTurf(b)])), null),
  );
}

// target에서 cutter와 겹치는 부분을 뺍니다. 반환값이 세 가지로 구분됩니다:
// - geometry: 남은 면
// - null: "정상적인 빈 결과"(target이 cutter에 완전히 가려짐) → 호출부에서 target 삭제
// - undefined: Turf 연산 실패(잘못된 폴리곤 등) → 호출부에서 no-op (실패가 삭제로 둔갑하면 안 됨)
// 실패와 빈 결과를 같은 null로 뭉뚱그리면, 예외가 곧 선택 도형 삭제가 되어 데이터 손실이 납니다.
export function subtractGeometry(
  target: PolygonalGeometry,
  cutter: PolygonalGeometry,
): PolygonalGeometry | null | undefined {
  const result = safeTurf<TurfPolygonFeature | null | undefined>(
    () => difference(featureCollection([toTurf(target), toTurf(cutter)])),
    undefined,
  );
  return result === undefined ? undefined : fromTurf(result);
}

// 두 폴리곤이 공유하는 면적(㎡). 겹치지 않거나 변끼리 닿기만 하거나 연산이 실패하면 0입니다.
export function overlapAreaSquareMeters(
  a: PolygonalGeometry,
  b: PolygonalGeometry,
): number {
  return safeTurf(() => {
    const shared = intersect(featureCollection([toTurf(a), toTurf(b)]));
    return shared ? area(shared) : 0;
  }, 0);
}

// 제거(빼기) 버튼은 "실제 면적 겹침"이 있을 때만 의미가 있습니다.
// 변끼리 닿기만 하면 면적이 0이므로, 작은 임계값으로 부동소수 슬리버를 거릅니다.
const MIN_OVERLAP_AREA_SQUARE_METERS = 1e-6;

export function hasAreaOverlap(
  a: PolygonalGeometry,
  b: PolygonalGeometry,
  minArea: number = MIN_OVERLAP_AREA_SQUARE_METERS,
): boolean {
  return overlapAreaSquareMeters(a, b) > minArea;
}

// 바운딩 박스 [minX(서), minY(남), maxX(동), maxY(북)] — 경위도.
export type BBox2D = [number, number, number, number];

// 폴리곤의 바운딩 박스를 구합니다(겹침 탐지의 "싼" 1차 필터용).
export function geometryBbox(geometry: PolygonalGeometry): BBox2D {
  const [minX, minY, maxX, maxY] = bbox(toTurf(geometry));
  return [minX, minY, maxX, maxY];
}

// 두 bbox가 겹치는지(broad-phase). 한 축이라도 분리되면 false.
// 1차 필터라 "포함"이 안전: 경계가 닿기만 해도 통과시키고, 실제 면적 겹침은 narrow-phase
// (hasAreaOverlap)에서 정확히 가린다. 절대 참 겹침을 잘못 버리면 안 되므로 ≤(포함) 비교.
export function bboxesOverlap(a: BBox2D, b: BBox2D): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}
