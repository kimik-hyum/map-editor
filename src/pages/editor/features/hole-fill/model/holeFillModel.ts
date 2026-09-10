import area from "@turf/area";
import { feature as toFeature, featureCollection } from "@turf/helpers";
import union from "@turf/union";
import type { MultiPolygon, Polygon } from "geojson";
import {
  EditabilityState,
  FeatureLifecycle,
  LockState,
  ValidationState,
  VisibilityState,
  type DeepReadonly,
  type EditorFeature,
  type EditorLayer,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";
import { subtractGeometry } from "../../geometry-ops/model/booleanOps";
import { normalizePolygonalGeometry } from "../../geometry-ops/model/normalizePolygonalGeometry";

export const DEFAULT_HOLE_AREA_SQUARE_METERS = 1_000;

export type PolygonHole = {
  polygonIndex: number;
  ringIndex: number;
  areaSquareMeters: number;
};

// 면적은 투영된 지도 좌표가 아닌 경위도에서 구한 실제 지표 면적(㎡)입니다.
// 구조가 깨진 ring은 이 명시적 편집 도구에서 자동 복구하지 않습니다.
export function inspectPolygonHoles(
  geometry: DeepReadonly<GeoJsonGeometry>,
): PolygonHole[] | null {
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return null;
  const polygonal = geometry as DeepReadonly<PolygonalGeometry>;
  const polygons =
    polygonal.type === "Polygon" ? [polygonal.coordinates] : polygonal.coordinates;
  if (polygons.length === 0) return null;
  const holes: PolygonHole[] = [];
  for (const [polygonIndex, polygon] of polygons.entries()) {
    if (polygon.length === 0) return null;
    for (const [ringIndex, ring] of polygon.entries()) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (
        ring.length < 4 ||
        !first ||
        !last ||
        first[0] !== last[0] ||
        first[1] !== last[1] ||
        new Set(ring.map(([x, y]) => `${x},${y}`)).size < 3 ||
        ring.some(
          (point) =>
            point.length !== 2 ||
            !Number.isFinite(point[0]) ||
            !Number.isFinite(point[1]) ||
            Math.abs(point[0]) > 180 ||
            Math.abs(point[1]) > 90,
        )
      )
        return null;
      const areaSquareMeters = area({
        type: "Polygon",
        coordinates: [ring.map(([x, y]) => [x, y])],
      });
      if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) return null;
      if (ringIndex > 0) holes.push({ polygonIndex, ringIndex, areaSquareMeters });
    }
  }
  return holes;
}

export function getHoleFillDisabledReason(
  layer: DeepReadonly<EditorLayer>,
  feature: DeepReadonly<EditorFeature>,
): string | null {
  const geometry = feature.feature.geometry;
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return "폴리곤의 내부 빈 공간만 채울 수 있습니다";
  }
  if (layer.behavior.lock === LockState.Locked) return "잠금을 해제한 뒤 사용하세요";
  if (
    layer.behavior.editability !== EditabilityState.Editable ||
    (feature.behavior?.editability !== undefined &&
      feature.behavior.editability !== EditabilityState.Editable) ||
    feature.behavior?.vertexEditable === false ||
    feature.state.lifecycle === FeatureLifecycle.Deleted
  )
    return "편집 가능한 폴리곤에서만 사용할 수 있습니다";
  if (
    layer.view.visibility === VisibilityState.Hidden ||
    feature.view?.visibility === VisibilityState.Hidden
  )
    return "도형을 표시한 뒤 사용하세요";
  if (
    feature.state.validation === ValidationState.Invalid ||
    feature.state.validation === ValidationState.Pending
  )
    return "도형의 검증 상태를 먼저 확인하세요";
  const holes = inspectPolygonHoles(geometry);
  if (!holes) return "도형의 좌표와 닫힌 경계를 먼저 확인하세요";
  return holes.length === 0 ? "완전히 둘러싸인 내부 빈 공간이 없습니다" : null;
}

export type HoleFillPreview = {
  geometry: PolygonalGeometry;
  // 원래 존재하던 섬은 제외한 실제 추가 면만 미리보기로 표시합니다.
  addedGeometry: PolygonalGeometry;
  filledCount: number;
  addedAreaSquareMeters: number;
};

export function fillSmallPolygonHoles(
  geometry: DeepReadonly<GeoJsonGeometry>,
  maxAreaSquareMeters: number,
): HoleFillPreview | null {
  if (!Number.isFinite(maxAreaSquareMeters) || maxAreaSquareMeters <= 0) return null;
  const holes = inspectPolygonHoles(geometry);
  if (!holes || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return null;
  }
  const selected = holes.filter((hole) => hole.areaSquareMeters <= maxAreaSquareMeters);
  if (selected.length === 0) return null;
  const original = structuredClone(geometry) as PolygonalGeometry;
  const polygons =
    original.type === "Polygon" ? [original.coordinates] : original.coordinates;
  const keys = new Set(
    selected.map((hole) => `${hole.polygonIndex}:${hole.ringIndex}`),
  );
  const filled = polygons.map((polygon, index) =>
    polygon.filter((_, ringIndex) => !keys.has(`${index}:${ringIndex}`)),
  );
  try {
    // MultiPolygon의 구멍 안에 다른 섬이 있을 수 있습니다. ring만 지우면
    // 서로 겹치는 polygon이 되므로 이 경우 전체 면을 합쳐 유효한 결과로 만듭니다.
    const result =
      filled.length === 1
        ? { type: "Polygon" as const, coordinates: filled[0] }
        : (union(
            featureCollection(
              filled.map((coordinates) =>
                toFeature({ type: "Polygon", coordinates } as Polygon),
              ),
            ),
          )?.geometry as Polygon | MultiPolygon | undefined);
    if (!result) return null;
    const normalized = normalizePolygonalGeometry(result as PolygonalGeometry);
    if (!normalized) return null;
    // 실패를 빈 결과로 취급하지 않고, 원래 있던 면이 사라지는 연산도 거부합니다.
    if (subtractGeometry(original, normalized) !== null) return null;
    const addedGeometry = subtractGeometry(normalized, original);
    if (!addedGeometry) return null;
    return {
      geometry: normalized,
      addedGeometry,
      filledCount: selected.length,
      addedAreaSquareMeters: area(addedGeometry),
    };
  } catch {
    return null;
  }
}
