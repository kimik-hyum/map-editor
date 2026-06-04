import type OpenLayersMap from "ol/Map";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import type { EditorRenderState } from "./createOpenLayersFeature";
import { createOpenLayersLayers } from "./createOpenLayersLayer";
import { getEditorLayerId } from "./editorContentLayers";

export function syncOpenLayersMapScene(
  map: OpenLayersMap,
  scene: EditorScene | null,
  renderState?: EditorRenderState,
) {
  const layers = map.getLayers();
  const existingEditorLayers = layers
    .getArray()
    .filter((layer) => getEditorLayerId(layer) !== undefined);

  for (const layer of existingEditorLayers) {
    layers.remove(layer);
  }

  if (!scene) {
    return;
  }

  for (const layer of createOpenLayersLayers(scene, renderState)) {
    layers.push(layer);
  }
}
