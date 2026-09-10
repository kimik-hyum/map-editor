import { createEmpty, extend, isEmpty } from "ol/extent";
import { createOpenLayersMap } from "@/pages/editor/adapters/openlayers/createOpenLayersMap";
import { syncOpenLayersMapScene } from "@/pages/editor/adapters/openlayers/syncOpenLayersMapScene";
import { forEachEditorContentLayer } from "@/pages/editor/adapters/openlayers/editorContentLayers";
import { normalizeSceneInput } from "@/pages/editor/messaging/normalizeSceneInput";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";

// 편집 상호작용이나 editorStore 없이 공개 scene만 표시하는 부모 지도입니다.
export function createDemoMap(target: HTMLElement) {
  const map = createOpenLayersMap({ target });
  const resizeObserver = new ResizeObserver(() => map.updateSize());
  resizeObserver.observe(target);

  return {
    sync(scene: EditorSceneInput) {
      syncOpenLayersMapScene(map, normalizeSceneInput(scene));
      const extent = createEmpty();
      forEachEditorContentLayer(map, (layer) => {
        const sourceExtent = layer.getSource()?.getExtent();
        if (layer.getVisible() && sourceExtent) extend(extent, sourceExtent);
      });
      if (!isEmpty(extent)) {
        // biome-ignore lint/suspicious/noFocusedTests: OpenLayers의 지도 범위 맞춤 API이며 테스트 함수가 아닙니다.
        map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 16 });
      }
    },
    dispose() {
      resizeObserver.disconnect();
      map.setTarget(undefined);
      map.dispose();
    },
  };
}
