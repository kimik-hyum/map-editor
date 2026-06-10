import type OpenLayersMap from "ol/Map";
import { fromLonLat } from "ol/proj";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { buildProjectedVertices } from "./createVertexOverlay";

// 도형이 화면에 들어오도록 뷰를 옮길 때의 여백(px)·애니메이션 시간·최대 줌.
// 최대 줌은 아주 작은 도형에서 과도하게 확대되는 것을 막습니다.
const FIT_PADDING_PX = 80;
const FIT_DURATION_MS = 350;
const FIT_MAX_ZOOM = 18;

const lonLatProject = (lon: number, lat: number) =>
  fromLonLat([lon, lat]) as [number, number];

// scene에서 도형을 찾아 그 범위로 지도를 부드럽게 이동합니다(패널 선택 → 지도 이동).
// OL 레이어 조회가 아니라 scene geometry로 범위를 계산하므로, 레이어가 숨김이어도 위치로는 이동합니다.
// 도형을 못 찾거나 정점이 없으면 아무것도 하지 않고 false를 반환합니다.
export function fitViewToFeature(
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

      // biome-ignore lint/suspicious/noFocusedTests: 테스트 포커싱이 아니라 지도 뷰를 범위에 맞추는 OpenLayers 호출입니다.
      map.getView().fit([minX, minY, maxX, maxY], {
        padding: [FIT_PADDING_PX, FIT_PADDING_PX, FIT_PADDING_PX, FIT_PADDING_PX],
        duration: FIT_DURATION_MS,
        maxZoom: FIT_MAX_ZOOM,
      });
      return true;
    }
  }

  return false;
}
