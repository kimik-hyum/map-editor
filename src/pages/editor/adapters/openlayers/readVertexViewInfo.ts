import type OpenLayersMap from "ol/Map";
import type { VertexOverlayViewInfo } from "./createVertexOverlay";

// 현재 ol View에서 정점 컬링/LOD에 필요한 뷰 상태를 읽습니다. 아직 레이아웃 전이면 undefined.
export function readVertexViewInfo(
  map: OpenLayersMap,
): VertexOverlayViewInfo | undefined {
  const view = map.getView();
  const size = map.getSize();
  const zoom = view.getZoom();
  const resolution = view.getResolution();
  if (zoom === undefined || resolution === undefined || !size) {
    return undefined;
  }

  return { zoom, resolution, extent: view.calculateExtent(size) };
}
