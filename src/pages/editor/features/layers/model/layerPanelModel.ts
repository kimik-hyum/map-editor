import {
  resolveLayerEffectiveOpacity,
  resolvePolygonStyle,
} from "../../../theme/editorStyleResolver";
import {
  SelectionState,
  VisibilityState,
  geometryKindLabels,
  type EditorDocument,
  type EditorFeature,
  type EditorLayer,
  type GeometryKind,
  layerRoleLabels,
} from "../../../types/editorTypes";

const selectionLabels: Partial<Record<SelectionState, string>> = {
  [SelectionState.Active]: "활성",
  [SelectionState.Selected]: "선택",
  [SelectionState.Hovered]: "호버",
};

export type LayerFeatureListItemViewModel = {
  id: string;
  name: string;
  visibility: VisibilityState;
  isVisible: boolean;
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

  return {
    id: feature.id,
    name: getFeatureName(feature),
    visibility,
    isVisible: visibility !== VisibilityState.Hidden,
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
    featureCount: layer.features.length,
    features: layer.features.map((feature) =>
      createLayerFeatureListItemViewModel(feature, layer),
    ),
  };
}

function getLayersByVisualStack(document: EditorDocument) {
  return document.layers
    .map((layer, sourceIndex) => ({ layer, sourceIndex }))
    .sort((left, right) => {
      const zIndexDiff = right.layer.view.zIndex - left.layer.view.zIndex;

      return zIndexDiff === 0 ? left.sourceIndex - right.sourceIndex : zIndexDiff;
    });
}

export function createLayerPanelViewModel(
  document: EditorDocument | null,
  activeLayerId: string | null,
): LayerPanelViewModel {
  if (!document) {
    return {
      isReady: false,
      isEmpty: true,
      layerCount: 0,
      featureCount: 0,
      layers: [],
    };
  }

  const orderedLayers = getLayersByVisualStack(document);
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
