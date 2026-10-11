import type OpenLayersMap from "ol/Map";
import { fromLonLat, transformExtent } from "ol/proj";

// 검색 위치는 편집 scene에 속하지 않습니다. 원격 좌표로 이동만 수행합니다.
export function focusRegionOnMap(
  map: OpenLayersMap,
  center: [number, number],
  bbox: [number, number, number, number],
  minZoom: number,
) {
  const view = map.getView();
  const extent = transformExtent(bbox, "EPSG:4326", view.getProjection());
  const size = map.getSize() ?? [800, 600];
  const availableSize = [Math.max(160, size[0] - 440), Math.max(160, size[1] - 120)];
  const resolution = view.getResolutionForExtent(extent, availableSize);
  const fitZoom = view.getZoomForResolution(resolution) ?? minZoom;
  view.cancelAnimations();
  view.animate({
    center: fromLonLat(center, view.getProjection()),
    zoom: Math.max(minZoom, Math.min(16, fitZoom)),
    duration: 450,
  });
}
