import { create } from "zustand";
import {
  EditorMode,
  FeatureLifecycle,
  type EditorDocument,
  type EditorLayerViewState,
  type EditorInitMessage,
  type GeoJsonGeometry,
} from "../types/editorTypes";

// 편집 모드의 기본값입니다. 모드 패널의 초기 선택과 store 초기화가 같은 값을 공유합니다.
const DEFAULT_EDITOR_MODE = EditorMode.AdministrativeDong;

type EditorStoreState = {
  sessionId: string | null;
  document: EditorDocument | null;
  activeLayerId: string | null;
  selectedFeatureIds: string[];
  hoveredFeatureId: string | null;
  activeMode: EditorMode;
  dirty: boolean;
};

type EditorStoreActions = {
  initializeFromMessage: (message: EditorInitMessage) => void;
  setDocument: (document: EditorDocument) => void;
  resetDocument: () => void;
  setActiveLayerId: (layerId: string | null) => void;
  setHoveredFeatureId: (featureId: string | null) => void;
  setSelectedFeatureIds: (featureIds: string[]) => void;
  setActiveMode: (mode: EditorMode) => void;
  updateLayerView: (layerId: string, view: Partial<EditorLayerViewState>) => void;
  updateFeatureGeometry: (featureId: string, geometry: GeoJsonGeometry) => void;
};

export type EditorStore = EditorStoreState & EditorStoreActions;

function getInitialActiveLayerId(document: EditorDocument | null) {
  return document?.layers[0]?.id ?? null;
}

function updateLayerViewInDocument(
  document: EditorDocument,
  layerId: string,
  view: Partial<EditorLayerViewState>,
): EditorDocument {
  return {
    ...document,
    layers: document.layers.map((layer) =>
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

function updateFeatureGeometryInDocument(
  document: EditorDocument,
  featureId: string,
  geometry: GeoJsonGeometry,
): EditorDocument {
  return {
    ...document,
    layers: document.layers.map((layer) => ({
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

export const useEditorStore = create<EditorStore>((set) => ({
  sessionId: null,
  document: null,
  activeLayerId: null,
  selectedFeatureIds: [],
  hoveredFeatureId: null,
  activeMode: DEFAULT_EDITOR_MODE,
  dirty: false,
  initializeFromMessage: (message) =>
    set({
      sessionId: message.sessionId,
      document: message.document,
      activeLayerId: getInitialActiveLayerId(message.document),
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      activeMode: DEFAULT_EDITOR_MODE,
      dirty: false,
    }),
  setDocument: (document) =>
    set({
      document,
      activeLayerId: getInitialActiveLayerId(document),
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      dirty: false,
    }),
  resetDocument: () =>
    set({
      sessionId: null,
      document: null,
      activeLayerId: null,
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      activeMode: DEFAULT_EDITOR_MODE,
      dirty: false,
    }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
  setHoveredFeatureId: (hoveredFeatureId) => set({ hoveredFeatureId }),
  setSelectedFeatureIds: (selectedFeatureIds) => set({ selectedFeatureIds }),
  setActiveMode: (activeMode) => set({ activeMode }),
  updateLayerView: (layerId, view) =>
    set((state) => ({
      document: state.document
        ? updateLayerViewInDocument(state.document, layerId, view)
        : state.document,
      dirty: Boolean(state.document),
    })),
  updateFeatureGeometry: (featureId, geometry) =>
    set((state) => ({
      document: state.document
        ? updateFeatureGeometryInDocument(state.document, featureId, geometry)
        : state.document,
      dirty: Boolean(state.document),
    })),
}));
