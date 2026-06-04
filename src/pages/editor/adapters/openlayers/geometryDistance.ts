import type Geometry from "ol/geom/Geometry";
import SimpleGeometry from "ol/geom/SimpleGeometry";

// 좌표와 geometry 사이의 거리 계산(map unit). 정점 편집·affordance 판정이 공유합니다.
// SimpleGeometry/flat 좌표/stride/getClosestPoint는 OpenLayers 의존이므로 어댑터 util로 둡니다.

function hypot(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

// 좌표에서 가장 가까운 "정점"까지의 거리. flat 좌표를 stride(2D/3D) 보폭으로 순회합니다.
// SimpleGeometry가 하나도 없으면 +Infinity.
export function nearestVertexDistance(
  geometries: readonly Geometry[],
  coordinate: number[],
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const geometry of geometries) {
    if (!(geometry instanceof SimpleGeometry)) {
      continue;
    }
    const flat = geometry.getFlatCoordinates();
    const stride = geometry.getStride();
    for (let i = 0; i + 1 < flat.length; i += stride) {
      const d = hypot(flat[i], flat[i + 1], coordinate[0], coordinate[1]);
      if (d < min) {
        min = d;
      }
    }
  }
  return min;
}

// 좌표에서 가장 가까운 "외곽선(경계)"까지의 거리. Polygon.getClosestPoint는 경계 기준입니다.
// geometry가 없으면 +Infinity.
export function nearestEdgeDistance(
  geometries: readonly Geometry[],
  coordinate: number[],
): number {
  let min = Number.POSITIVE_INFINITY;
  for (const geometry of geometries) {
    const closest = geometry.getClosestPoint(coordinate);
    const d = hypot(closest[0], closest[1], coordinate[0], coordinate[1]);
    if (d < min) {
      min = d;
    }
  }
  return min;
}
