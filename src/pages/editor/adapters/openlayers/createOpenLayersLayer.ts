import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import {
  VisibilityState,
  type EditorDocument,
  type EditorLayer,
} from "../../types/editorTypes";
import { createOpenLayersFeature } from "./createOpenLayersFeature";

// 에디터 레이어 하나를 OpenLayers VectorLayer로 변환합니다.
export function createOpenLayersVectorLayer(layer: EditorLayer) {
  const features = layer.features.flatMap((feature) => {
    const openLayersFeature = createOpenLayersFeature(feature, layer);

    return openLayersFeature ? [openLayersFeature] : [];
  });
  const opacity =
    layer.view.visibility === VisibilityState.Dimmed
      ? layer.view.opacity * 0.5
      : layer.view.opacity;

  return new VectorLayer({
    opacity,
    source: new VectorSource({
      features,
    }),
    visible: layer.view.visibility !== VisibilityState.Hidden,
    zIndex: layer.view.zIndex,
  });
}

// EditorDocument의 레이어 목록을 OpenLayers가 사용할 레이어 목록으로 변환합니다.
export function createOpenLayersLayers(editorDocument: EditorDocument) {
  return editorDocument.layers.map(createOpenLayersVectorLayer);
}
