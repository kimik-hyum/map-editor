import {
  resolveLayerEffectiveOpacity,
  resolvePolygonStyle,
} from "@/pages/editor/theme/editorStyleResolver";
import {
  EditabilityState,
  VisibilityState,
  editabilityLabels,
  geometryKindLabels,
  type DeepReadonly,
  type EditorScene,
  type EditorFeature,
  type EditorLayer,
  type EditorLayerViewState,
  type GeometryKind,
  layerRoleLabels,
} from "@/pages/editor/types/editorTypes";

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
  // 런타임 선택(selectedFeatureIds) 기준. 지도 클릭/패널 클릭 어느 쪽이든 같은 값을 본다.
  isSelected: boolean;
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

function getFeatureVisibility(feature: DeepReadonly<EditorFeature>) {
  return feature.view?.visibility ?? VisibilityState.Visible;
}

function getFeatureName(feature: DeepReadonly<EditorFeature>) {
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
  feature: DeepReadonly<EditorFeature>,
  layer: DeepReadonly<EditorLayer>,
  selectedIds: ReadonlySet<string>,
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
    isSelected: selectedIds.has(feature.id),
    // 스타일 리졸버는 읽기 전용 입력을 받지 않으므로 경계에서 mutable로 캐스팅한다(변경하지 않음).
    accentColor: resolvePolygonStyle(feature as EditorFeature, layer as EditorLayer)
      .strokeColor,
  };
}

function createLayerListItemViewModel(
  layer: DeepReadonly<EditorLayer>,
  activeLayerId: string | null,
  selectedIds: ReadonlySet<string>,
  stackIndex: number,
): LayerListItemViewModel {
  return {
    id: layer.id,
    name: layer.name,
    visibility: layer.view.visibility,
    isActive: layer.id === activeLayerId,
    isDimmed: layer.view.visibility === VisibilityState.Dimmed,
    isVisible: layer.view.visibility !== VisibilityState.Hidden,
    opacity: resolveLayerEffectiveOpacity(layer.view as EditorLayerViewState),
    orderLabel: `#${stackIndex + 1}`,
    roleLabels: layer.roles.map((role) => layerRoleLabels[role]),
    editabilityLabel:
      layer.behavior.editability === EditabilityState.Editable
        ? null
        : editabilityLabels[layer.behavior.editability],
    featureCount: layer.features.length,
    features: layer.features.map((feature) =>
      createLayerFeatureListItemViewModel(feature, layer, selectedIds),
    ),
  };
}

function getLayersByVisualStack(scene: DeepReadonly<EditorScene>) {
  return scene.layers
    .map((layer, sourceIndex) => ({ layer, sourceIndex }))
    .sort((left, right) => {
      const zIndexDiff = right.layer.view.zIndex - left.layer.view.zIndex;

      return zIndexDiff === 0 ? left.sourceIndex - right.sourceIndex : zIndexDiff;
    });
}

export function createLayerPanelViewModel(
  scene: DeepReadonly<EditorScene> | null,
  activeLayerId: string | null,
  selectedFeatureIds: readonly string[] = [],
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

  const selectedIds = new Set(selectedFeatureIds);
  const orderedLayers = getLayersByVisualStack(scene);
  const layers = orderedLayers.map(({ layer }, stackIndex) =>
    createLayerListItemViewModel(layer, activeLayerId, selectedIds, stackIndex),
  );

  return {
    isReady: true,
    isEmpty: layers.length === 0,
    layerCount: layers.length,
    featureCount: layers.reduce((sum, layer) => sum + layer.featureCount, 0),
    layers,
  };
}
