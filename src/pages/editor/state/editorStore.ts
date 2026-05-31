import { create } from "zustand";
import {
  BoundaryKind,
  EditorMode,
  FeatureLifecycle,
  VisibilityState,
  type EditorScene,
  type EditorFeatureViewState,
  type EditorLayerViewState,
  type EditorInitMessage,
  type GeoJsonGeometry,
} from "../types/editorTypes";

// 편집 모드의 기본값입니다. 모드 패널의 초기 선택과 store 초기화가 같은 값을 공유합니다.
const DEFAULT_EDITOR_MODE = EditorMode.Select;

// 경계 도구의 기본 경계 종류입니다.
const DEFAULT_BOUNDARY_KIND = BoundaryKind.AdminDong;

type EditorStoreState = {
  sessionId: string | null;
  scene: EditorScene | null;
  activeLayerId: string | null;
  selectedFeatureIds: string[];
  hoveredFeatureId: string | null;
  activeMode: EditorMode;
  activeBoundaryKind: BoundaryKind;
  dirty: boolean;
};

type EditorStoreActions = {
  initializeFromMessage: (message: EditorInitMessage) => void;
  setScene: (scene: EditorScene) => void;
  resetScene: () => void;
  setActiveLayerId: (layerId: string | null) => void;
  setHoveredFeatureId: (featureId: string | null) => void;
  setSelectedFeatureIds: (featureIds: string[]) => void;
  setActiveMode: (mode: EditorMode) => void;
  setActiveBoundaryKind: (kind: BoundaryKind) => void;
  updateLayerView: (layerId: string, view: Partial<EditorLayerViewState>) => void;
  updateFeatureView: (featureId: string, view: Partial<EditorFeatureViewState>) => void;
  updateFeatureGeometry: (featureId: string, geometry: GeoJsonGeometry) => void;
};

export type EditorStore = EditorStoreState & EditorStoreActions;

function getInitialActiveLayerId(scene: EditorScene | null) {
  return scene?.layers[0]?.id ?? null;
}

function updateLayerViewInScene(
  scene: EditorScene,
  layerId: string,
  view: Partial<EditorLayerViewState>,
): EditorScene {
  return {
    ...scene,
    layers: scene.layers.map((layer) =>
      layer.id === layerId
        ? {
            ...layer,
            view: {
              ...layer.view,
              ...view,
            },
          }
        : layer,
    ),
  };
}

function updateFeatureGeometryInScene(
  scene: EditorScene,
  featureId: string,
  geometry: GeoJsonGeometry,
): EditorScene {
  return {
    ...scene,
    layers: scene.layers.map((layer) => ({
      ...layer,
      features: layer.features.map((feature) => {
        if (feature.id !== featureId) {
          return feature;
        }

        return {
          ...feature,
          feature: {
            ...feature.feature,
            geometry,
          },
          state: {
            ...feature.state,
            lifecycle:
              feature.state.lifecycle === FeatureLifecycle.Created
                ? FeatureLifecycle.Created
                : FeatureLifecycle.Updated,
          },
        };
      }),
    })),
  };
}

function updateFeatureViewInScene(
  scene: EditorScene,
  featureId: string,
  view: Partial<EditorFeatureViewState>,
): EditorScene {
  return {
    ...scene,
    layers: scene.layers.map((layer) => ({
      ...layer,
      features: layer.features.map((feature) =>
        feature.id === featureId
          ? {
              ...feature,
              view: {
                visibility: feature.view?.visibility ?? VisibilityState.Visible,
                ...(feature.view ?? {}),
                ...view,
              },
            }
          : feature,
      ),
    })),
  };
}

export const useEditorStore = create<EditorStore>((set) => ({
  sessionId: null,
  scene: null,
  activeLayerId: null,
  selectedFeatureIds: [],
  hoveredFeatureId: null,
  activeMode: DEFAULT_EDITOR_MODE,
  activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
  dirty: false,
  initializeFromMessage: (message) =>
    set({
      sessionId: message.sessionId,
      scene: message.scene,
      activeLayerId: getInitialActiveLayerId(message.scene),
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      activeMode: DEFAULT_EDITOR_MODE,
      activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
      dirty: false,
    }),
  setScene: (scene) =>
    set({
      scene,
      activeLayerId: getInitialActiveLayerId(scene),
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      dirty: false,
    }),
  resetScene: () =>
    set({
      sessionId: null,
      scene: null,
      activeLayerId: null,
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      activeMode: DEFAULT_EDITOR_MODE,
      activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
      dirty: false,
    }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
  setHoveredFeatureId: (hoveredFeatureId) => set({ hoveredFeatureId }),
  setSelectedFeatureIds: (selectedFeatureIds) => set({ selectedFeatureIds }),
  setActiveMode: (activeMode) => set({ activeMode }),
  setActiveBoundaryKind: (activeBoundaryKind) => set({ activeBoundaryKind }),
  updateLayerView: (layerId, view) =>
    set((state) => ({
      scene: state.scene
        ? updateLayerViewInScene(state.scene, layerId, view)
        : state.scene,
      dirty: Boolean(state.scene),
    })),
  updateFeatureView: (featureId, view) =>
    set((state) => ({
      scene: state.scene
        ? updateFeatureViewInScene(state.scene, featureId, view)
        : state.scene,
      dirty: Boolean(state.scene),
    })),
  updateFeatureGeometry: (featureId, geometry) =>
    set((state) => ({
      scene: state.scene
        ? updateFeatureGeometryInScene(state.scene, featureId, geometry)
        : state.scene,
      dirty: Boolean(state.scene),
    })),
}));
