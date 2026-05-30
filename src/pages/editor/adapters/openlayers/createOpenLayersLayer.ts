import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { resolveLayerEffectiveOpacity } from "../../theme/editorStyleResolver";
import {
  VisibilityState,
  type EditorScene,
  type EditorLayer,
} from "../../types/editorTypes";
import { createOpenLayersFeature } from "./createOpenLayersFeature";

export const editorLayerIdProperty = "mapEditorLayerId";

// 에디터 레이어 하나를 OpenLayers VectorLayer로 변환합니다.
export function createOpenLayersVectorLayer(layer: EditorLayer) {
  const features = layer.features.flatMap((feature) => {
    const openLayersFeature = createOpenLayersFeature(feature, layer);

    return openLayersFeature ? [openLayersFeature] : [];
  });
  const opacity = resolveLayerEffectiveOpacity(layer.view);

  const openLayersLayer = new VectorLayer({
    opacity,
    source: new VectorSource({
      features,
    }),
    visible: layer.view.visibility !== VisibilityState.Hidden,
    zIndex: layer.view.zIndex,
  });

  openLayersLayer.set(editorLayerIdProperty, layer.id);

  return openLayersLayer;
}

// EditorScene의 레이어 목록을 OpenLayers가 사용할 레이어 목록으로 변환합니다.
export function createOpenLayersLayers(scene: EditorScene) {
  return scene.layers.map(createOpenLayersVectorLayer);
}
