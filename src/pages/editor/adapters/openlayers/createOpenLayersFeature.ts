import Feature from "ol/Feature";
import {
  VisibilityState,
  type EditorFeature,
  type EditorLayer,
} from "@/pages/editor/types/editorTypes";
import { createOpenLayersGeometry } from "./createOpenLayersGeometry";
import { createOpenLayersStyle } from "./createOpenLayersStyle";

// 선택/호버 같은 렌더 상태입니다. store(scene 밖)에서 오므로 어댑터가 보유하고 스타일 함수가 참조합니다.
export type EditorRenderState = {
  selectedIds: ReadonlySet<string>;
  hoveredId: string | null;
};

// 에디터 도형 하나를 OpenLayers Feature로 변환하고 렌더링 style을 연결합니다.
// 정적 style 대신 style 함수를 써서, 선택/호버가 바뀌면 해당 레이어를 layer.changed()로
// 무효화(invalidateFeatureStyles)해 스타일이 다시 평가되도록 합니다.
export function createOpenLayersFeature(
  feature: EditorFeature,
  layer: EditorLayer,
  renderState?: EditorRenderState,
) {
  if (feature.view?.visibility === VisibilityState.Hidden) {
    return null;
  }

  const geometry = createOpenLayersGeometry(feature.feature.geometry);

  if (!geometry) {
    return null;
  }

  const openLayersFeature = new Feature({
    geometry,
    name: feature.name,
  });

  openLayersFeature.setId(feature.id);
  openLayersFeature.setStyle(() =>
    createOpenLayersStyle(feature, layer, {
      selected: renderState?.selectedIds.has(feature.id) ?? false,
      hovered: renderState?.hoveredId === feature.id,
    }),
  );

  return openLayersFeature;
}
