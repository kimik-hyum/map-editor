import View from "ol/View";
import { fromLonLat } from "ol/proj";
import type { EditorDocument } from "../../types/editorTypes";

// 문서 viewport 값을 OpenLayers View 객체로 변환합니다.
export function createOpenLayersMapView(editorDocument: EditorDocument) {
  return new View({
    center: fromLonLat(editorDocument.viewport?.center ?? [126.98, 37.57]),
    zoom: editorDocument.viewport?.zoom ?? 12,
  });
}
