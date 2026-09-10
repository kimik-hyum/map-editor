import OpenLayersMap from "ol/Map";
import { defaults as defaultControls } from "ol/control/defaults";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
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
    // 패널/버튼에 포커스가 있어도 첫 드래그부터 팬을 시작합니다.
    // OL Map의 암묵적 기본값(onFocusOnly: true)은 tabindex 지도의 첫 입력을 놓칩니다.
    interactions: defaultInteractions({ onFocusOnly: false }),
    controls: defaultControls({
      zoomOptions: { zoomInTipLabel: "지도 확대", zoomOutTipLabel: "지도 축소" },
    }),
    layers: [createOpenStreetMapLayer()],
    target,
    view: createOpenLayersMapView(scene),
  });
}
