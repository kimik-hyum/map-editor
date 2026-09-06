import type {
  EditorCoordinate,
  PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";

// Boolean 연산/좌표 반올림으로 생긴 1~2점짜리 내부 ring만 제거합니다.
// 면적 임계값이나 좌표 스냅을 사용하지 않아 정상적인 작은 구멍·섬은 그대로 보존합니다.
// 외곽선이 무효하면 도형/섬을 조용히 버리지 않고 전체 연산을 실패시킵니다.
export function normalizePolygonalGeometry(
  geometry: PolygonalGeometry,
): PolygonalGeometry | null {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (polygons.length === 0) return null;

  const normalized: EditorCoordinate[][][] = [];
  for (const polygon of polygons) {
    if (polygon.length === 0) return null;
    const rings: EditorCoordinate[][] = [];
    for (const [index, ring] of polygon.entries()) {
      if (
        ring.some(
          (point) =>
            point.length !== 2 ||
            !Number.isFinite(point[0]) ||
            !Number.isFinite(point[1]) ||
            Math.abs(point[0]) > 180 ||
            Math.abs(point[1]) > 90,
        )
      ) {
        return null;
      }
      if (new Set(ring.map(([x, y]) => `${x},${y}`)).size < 3) {
        if (index === 0) return null;
        continue;
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      rings.push(
        first[0] === last[0] && first[1] === last[1] ? ring : [...ring, [...first]],
      );
    }
    normalized.push(rings);
  }
  return geometry.type === "Polygon"
    ? { type: "Polygon", coordinates: normalized[0] }
    : { type: "MultiPolygon", coordinates: normalized };
}
