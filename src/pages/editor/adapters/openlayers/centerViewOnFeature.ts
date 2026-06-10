import type OpenLayersMap from "ol/Map";
import { fromLonLat } from "ol/proj";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { buildProjectedVertices } from "./createVertexOverlay";

// 중심 이동 애니메이션 시간(ms). 줌은 바꾸지 않는다.
const CENTER_DURATION_MS = 350;

const lonLatProject = (lon: number, lat: number) =>
  fromLonLat([lon, lat]) as [number, number];

// scene에서 도형을 찾아 "현재 줌을 유지한 채" 그 도형의 중심으로 지도를 부드럽게 이동합니다
// (패널 선택 → 지도 이동). 줌까지 바꾸는 맞춤은 화면이 크게 튀어 쓰지 않습니다.
// OL 레이어 조회가 아니라 scene geometry로 중심을 계산하므로, 레이어가 숨김이어도 위치로는 이동합니다.
// 도형을 못 찾거나 정점이 없으면 아무것도 하지 않고 false를 반환합니다.
export function centerViewOnFeature(
  map: OpenLayersMap,
  scene: EditorScene | null,
  featureId: string,
): boolean {
  if (!scene) {
    return false;
  }

  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      if (feature.id !== featureId) {
        continue;
      }

      const vertices = buildProjectedVertices(feature.feature.geometry, lonLatProject);
      if (vertices.length === 0) {
        return false;
      }

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const vertex of vertices) {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
      }

      map.getView().animate({
        center: [(minX + maxX) / 2, (minY + maxY) / 2],
        duration: CENTER_DURATION_MS,
      });
      return true;
    }
  }

  return false;
}
