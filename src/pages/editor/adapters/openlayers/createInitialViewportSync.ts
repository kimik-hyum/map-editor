import type OpenLayersMap from "ol/Map";
import { fromLonLat } from "ol/proj";
import type { EditorScene } from "@/pages/editor/types/editorTypes";

// READY 뒤 처음 받은 scene의 뷰만 적용합니다. 편집·재INIT은 현재 팬/줌을 유지합니다.
export function createInitialViewportSync(map: OpenLayersMap) {
  let initialized = false;
  return {
    sync(scene: EditorScene | null) {
      if (!scene || initialized) return;
      initialized = true;
      const view = map.getView();
      if (scene.viewport?.center) {
        view.setCenter(fromLonLat(scene.viewport.center, view.getProjection()));
      }
      if (scene.viewport?.zoom !== undefined) view.setZoom(scene.viewport.zoom);
    },
  };
}
