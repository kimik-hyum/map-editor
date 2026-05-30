import View from "ol/View";
import { fromLonLat } from "ol/proj";
import type { EditorScene } from "../../types/editorTypes";

// 문서 viewport 값을 OpenLayers View 객체로 변환합니다.
export function createOpenLayersMapView(scene?: EditorScene | null) {
  return new View({
    center: fromLonLat(scene?.viewport?.center ?? [126.98, 37.57]),
    zoom: scene?.viewport?.zoom ?? 12,
  });
}
