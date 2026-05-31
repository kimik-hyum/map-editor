import OpenLayersMap from "ol/Map";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import { createOpenLayersMapView } from "./createOpenLayersMapView";
import { createOpenStreetMapLayer } from "./createOpenStreetMapLayer";

type CreateOpenLayersMapOptions = {
  target: HTMLElement;
  scene?: EditorScene | null;
};

// 에디터 씬과 DOM target을 받아 OpenLayers Map 인스턴스를 생성합니다.
export function createOpenLayersMap({ target, scene }: CreateOpenLayersMapOptions) {
  return new OpenLayersMap({
    layers: [createOpenStreetMapLayer()],
    target,
    view: createOpenLayersMapView(scene),
  });
}
