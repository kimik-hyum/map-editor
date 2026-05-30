import type OpenLayersMap from "ol/Map";
import type BaseLayer from "ol/layer/Base";
import type { EditorDocument } from "../../types/editorTypes";
import { createOpenLayersLayers, editorLayerIdProperty } from "./createOpenLayersLayer";

function isEditorDocumentLayer(layer: BaseLayer) {
  return typeof layer.get(editorLayerIdProperty) === "string";
}

export function syncOpenLayersMapDocument(
  map: OpenLayersMap,
  editorDocument: EditorDocument | null,
) {
  const layers = map.getLayers();
  const existingEditorLayers = layers.getArray().filter(isEditorDocumentLayer);

  for (const layer of existingEditorLayers) {
    layers.remove(layer);
  }

  if (!editorDocument) {
    return;
  }

  for (const layer of createOpenLayersLayers(editorDocument)) {
    layers.push(layer);
  }
}
