import Feature from "ol/Feature";
import type { EditorFeature, EditorLayer } from "../../types/editorTypes";
import { createOpenLayersGeometry } from "./createOpenLayersGeometry";
import { createOpenLayersStyle } from "./createOpenLayersStyle";

// 에디터 도형 하나를 OpenLayers Feature로 변환하고 렌더링 style을 연결합니다.
export function createOpenLayersFeature(feature: EditorFeature, layer: EditorLayer) {
  const geometry = createOpenLayersGeometry(feature.feature.geometry);

  if (!geometry) {
    return null;
  }

  const openLayersFeature = new Feature({
    geometry,
    name: feature.name,
  });

  openLayersFeature.setId(feature.id);
  openLayersFeature.setStyle(createOpenLayersStyle(feature, layer));

  return openLayersFeature;
}
