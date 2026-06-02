import type OpenLayersMap from "ol/Map";
import type BaseLayer from "ol/layer/Base";
import type { EditorScene } from "@/pages/editor/types/editorTypes";
import type { EditorRenderState } from "./createOpenLayersFeature";
import { createOpenLayersLayers, editorLayerIdProperty } from "./createOpenLayersLayer";

function isEditorSceneLayer(layer: BaseLayer) {
  return typeof layer.get(editorLayerIdProperty) === "string";
}

export function syncOpenLayersMapScene(
  map: OpenLayersMap,
  scene: EditorScene | null,
  renderState?: EditorRenderState,
) {
  const layers = map.getLayers();
  const existingEditorLayers = layers.getArray().filter(isEditorSceneLayer);

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
