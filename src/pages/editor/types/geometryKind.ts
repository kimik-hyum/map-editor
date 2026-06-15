import { GeometryKind } from "./enums";
import type { EditorCoordinate, GeoJsonGeometry } from "./geometry";

// GeoJSON geometry 타입 → 에디터 도형 종류(GeometryKind) 매핑입니다.
// 입력 정규화(normalizeSceneInput)와 불리언 연산 결과(Polygon↔MultiPolygon 전환)가
// 모두 이 한 곳에서 종류를 파생해, geometryKind가 geometry와 어긋나지 않게 합니다.
const GEOMETRY_KIND_BY_TYPE: Record<GeoJsonGeometry["type"], GeometryKind> = {
  Point: GeometryKind.Point,
  MultiPoint: GeometryKind.MultiPoint,
  LineString: GeometryKind.Path,
  MultiLineString: GeometryKind.MultiPath,
  Polygon: GeometryKind.Polygon,
  MultiPolygon: GeometryKind.MultiPolygon,
};

export function geometryKindFromGeometry(geometry: GeoJsonGeometry): GeometryKind {
  return GEOMETRY_KIND_BY_TYPE[geometry.type];
}

// 면(폴리곤 계열) geometry만 추린 좁은 타입입니다. 불리언 연산(병합/제거)의 입출력에 씁니다.
export type PolygonalGeometry =
  | { type: "Polygon"; coordinates: EditorCoordinate[][] }
  | { type: "MultiPolygon"; coordinates: EditorCoordinate[][][] };

// geometry가 폴리곤/멀티폴리곤인지 좁혀 줍니다(불리언 연산 대상 판별).
export function isPolygonalGeometry(
  geometry: GeoJsonGeometry,
): geometry is PolygonalGeometry {
  return geometry.type === "Polygon" || geometry.type === "MultiPolygon";
}
