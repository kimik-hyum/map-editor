import area from "@turf/area";
import difference from "@turf/difference";
import { feature as toFeature, featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import pointOnFeature from "@turf/point-on-feature";
import union from "@turf/union";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type {
  EditorCoordinate,
  PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";

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

// target에서 cutter와 겹치는 부분을 뺍니다. target이 완전히 가려지거나 실패하면 null(빈 결과)입니다.
export function subtractGeometry(
  target: PolygonalGeometry,
  cutter: PolygonalGeometry,
): PolygonalGeometry | null {
  return fromTurf(
    safeTurf(
      () => difference(featureCollection([toTurf(target), toTurf(cutter)])),
      null,
    ),
  );
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
export const MIN_OVERLAP_AREA_SQUARE_METERS = 1e-6;

export function hasAreaOverlap(
  a: PolygonalGeometry,
  b: PolygonalGeometry,
  minArea: number = MIN_OVERLAP_AREA_SQUARE_METERS,
): boolean {
  return overlapAreaSquareMeters(a, b) > minArea;
}

// 폴리곤 내부 대표점(경도/위도)입니다. 마커 칩을 이 점에 (중앙 정렬로) 도형 "안쪽"에 둡니다.
// 이웃 위에 얹히지 않고 그 도형 소속임이 분명해지도록, bbox 상단이 아니라 면 안의 점을 씁니다.
// pointOnFeature는 결과가 항상 도형 위(폴리곤은 내부)임을 보장합니다(오목 도형 대비).
// 잘못된 폴리곤이면 null(호출부에서 그 마커를 건너뜀) — 후보 도출 effect를 무너뜨리지 않기 위함.
export function polygonInteriorLonLat(
  geometry: PolygonalGeometry,
): [number, number] | null {
  return safeTurf<[number, number] | null>(() => {
    const [lon, lat] = pointOnFeature(toTurf(geometry)).geometry.coordinates;
    return [lon, lat] as EditorCoordinate;
  }, null);
}
