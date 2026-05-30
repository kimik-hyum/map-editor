import OpenLayersMap from "ol/Map";
import type { EditorDocument } from "../../types/editorTypes";
import { createOpenLayersMapView } from "./createOpenLayersMapView";
import { createOpenStreetMapLayer } from "./createOpenStreetMapLayer";

type CreateOpenLayersMapOptions = {
  target: HTMLElement;
  editorDocument?: EditorDocument | null;
};

// 에디터 문서와 DOM target을 받아 OpenLayers Map 인스턴스를 생성합니다.
export function createOpenLayersMap({
  target,
  editorDocument,
}: CreateOpenLayersMapOptions) {
  return new OpenLayersMap({
    layers: [createOpenStreetMapLayer()],
    target,
    view: createOpenLayersMapView(editorDocument),
  });
}
