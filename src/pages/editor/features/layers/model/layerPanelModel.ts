import {
  resolveLayerEffectiveOpacity,
  resolvePolygonStyle,
} from "@/pages/editor/theme/editorStyleResolver";
import {
  EditabilityState,
  SelectionState,
  VisibilityState,
  editabilityLabels,
  geometryKindLabels,
  type EditorScene,
  type EditorFeature,
  type EditorLayer,
  type GeometryKind,
  layerRoleLabels,
} from "@/pages/editor/types/editorTypes";

const selectionLabels: Partial<Record<SelectionState, string>> = {
  [SelectionState.Active]: "활성",
  [SelectionState.Selected]: "선택",
  [SelectionState.Hovered]: "호버",
};

export type LayerFeatureListItemViewModel = {
  id: string;
  name: string;
  // 도형 자체의 표시 상태입니다(토글 다음 상태 계산에 사용).
  visibility: VisibilityState;
  // 부모 레이어까지 반영한 유효 표시 상태입니다(레이어가 숨김이면 false).
  isVisible: boolean;
  // 부모 레이어가 숨김이면 도형 토글을 막습니다(레이어를 먼저 표시해야 함).
  isToggleDisabled: boolean;
  geometryKind: GeometryKind;
  geometryKindLabel: string;
  selectionLabel: string | null;
  accentColor: string;
};

export type LayerListItemViewModel = {
  id: string;
  name: string;
  visibility: VisibilityState;
  isActive: boolean;
  isDimmed: boolean;
  isVisible: boolean;
  opacity: number;
  orderLabel: string;
  roleLabels: string[];
  // 편집 불가(읽기/비활성) 역량을 알리는 배지 라벨입니다. 편집 가능(기본)이면 null.
  editabilityLabel: string | null;
  featureCount: number;
  features: LayerFeatureListItemViewModel[];
};

export type LayerPanelViewModel = {
  isReady: boolean;
  isEmpty: boolean;
  layerCount: number;
  featureCount: number;
  layers: LayerListItemViewModel[];
};

export function getNextFeatureVisibility(visibility: VisibilityState) {
  return visibility === VisibilityState.Hidden
    ? VisibilityState.Visible
    : VisibilityState.Hidden;
}

// 레이어 표시 토글의 다음 상태입니다. Hidden이면 Visible로, 그 외(Visible/Dimmed)는 Hidden으로 전환합니다.
export function getNextLayerVisibility(visibility: VisibilityState) {
  return visibility === VisibilityState.Hidden
    ? VisibilityState.Visible
    : VisibilityState.Hidden;
}

function getFeatureVisibility(feature: EditorFeature) {
  return feature.view?.visibility ?? VisibilityState.Visible;
}

function getFeatureName(feature: EditorFeature) {
  const propertyLabel = feature.feature.properties?.label;

  if (feature.name) {
    return feature.name;
  }

  if (typeof propertyLabel === "string" && propertyLabel.trim().length > 0) {
    return propertyLabel;
  }

  return feature.id;
}

function createLayerFeatureListItemViewModel(
  feature: EditorFeature,
  layer: EditorLayer,
): LayerFeatureListItemViewModel {
  const visibility = getFeatureVisibility(feature);
  // 부모 레이어가 숨김이면 그 아래 도형은 모두 유효 숨김으로 본다(도형 자체 상태는 보존).
  const layerVisible = layer.view.visibility !== VisibilityState.Hidden;
  const featureVisible = visibility !== VisibilityState.Hidden;

  return {
    id: feature.id,
    name: getFeatureName(feature),
    visibility,
    isVisible: layerVisible && featureVisible,
    isToggleDisabled: !layerVisible,
    geometryKind: feature.geometryKind,
    geometryKindLabel: geometryKindLabels[feature.geometryKind],
    selectionLabel: selectionLabels[feature.state.selection] ?? null,
    accentColor: resolvePolygonStyle(feature, layer).strokeColor,
  };
}

function createLayerListItemViewModel(
  layer: EditorLayer,
  activeLayerId: string | null,
  stackIndex: number,
): LayerListItemViewModel {
  return {
    id: layer.id,
    name: layer.name,
    visibility: layer.view.visibility,
    isActive: layer.id === activeLayerId,
    isDimmed: layer.view.visibility === VisibilityState.Dimmed,
    isVisible: layer.view.visibility !== VisibilityState.Hidden,
    opacity: resolveLayerEffectiveOpacity(layer.view),
    orderLabel: `#${stackIndex + 1}`,
    roleLabels: layer.roles.map((role) => layerRoleLabels[role]),
    editabilityLabel:
      layer.behavior.editability === EditabilityState.Editable
        ? null
        : editabilityLabels[layer.behavior.editability],
    featureCount: layer.features.length,
    features: layer.features.map((feature) =>
      createLayerFeatureListItemViewModel(feature, layer),
    ),
  };
}

function getLayersByVisualStack(scene: EditorScene) {
  return scene.layers
    .map((layer, sourceIndex) => ({ layer, sourceIndex }))
    .sort((left, right) => {
      const zIndexDiff = right.layer.view.zIndex - left.layer.view.zIndex;

      return zIndexDiff === 0 ? left.sourceIndex - right.sourceIndex : zIndexDiff;
    });
}

export function createLayerPanelViewModel(
  scene: EditorScene | null,
  activeLayerId: string | null,
): LayerPanelViewModel {
  if (!scene) {
    return {
      isReady: false,
      isEmpty: true,
      layerCount: 0,
      featureCount: 0,
      layers: [],
    };
  }

  const orderedLayers = getLayersByVisualStack(scene);
  const layers = orderedLayers.map(({ layer }, stackIndex) =>
    createLayerListItemViewModel(layer, activeLayerId, stackIndex),
  );

  return {
    isReady: true,
    isEmpty: layers.length === 0,
    layerCount: layers.length,
    featureCount: layers.reduce((sum, layer) => sum + layer.featureCount, 0),
    layers,
  };
}
