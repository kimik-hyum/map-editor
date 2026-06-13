import type OpenLayersMap from "ol/Map";
import { fromLonLat } from "ol/proj";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { buildProjectedVertices } from "./createVertexOverlay";

const lonLatProject = (lon: number, lat: number) =>
  fromLonLat([lon, lat]) as [number, number];

// 도형의 화면 앵커 픽셀(바운딩 박스 상단 중앙)을 계산합니다.
// 도형 위에 띄우는 버튼 툴바를 이 지점 "위쪽"에 배치해, 버튼이 도형 본체를 가리지 않게 합니다.
// scene geometry(EPSG:4326)에서 직접 bbox를 잡으므로 OL 피처 존재 여부와 무관합니다.
// 도형을 못 찾거나 정점이 없으면 null을 반환합니다.
export function getFeatureAnchorPixel(
  map: OpenLayersMap,
  scene: EditorScene | null,
  featureId: string,
): { x: number; y: number } | null {
  if (!scene) {
    return null;
  }

  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      if (feature.id !== featureId) {
        continue;
      }

      const vertices = buildProjectedVertices(feature.feature.geometry, lonLatProject);
      if (vertices.length === 0) {
        return null;
      }

      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const vertex of vertices) {
        minX = Math.min(minX, vertex.x);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
      }

      // 투영 좌표에서 Y가 클수록 북쪽(화면 위). 상단 중앙을 앵커로 삼는다.
      const pixel = map.getPixelFromCoordinate([(minX + maxX) / 2, maxY]);
      if (!pixel) {
        return null;
      }
      return { x: pixel[0], y: pixel[1] };
    }
  }

  return null;
}
