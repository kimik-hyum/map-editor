import { create } from "zustand";
import { sampleEditorDocument } from "../fixtures/sampleEditorDocument";
import {
  EditorToolMode,
  FeatureLifecycle,
  type EditorDocument,
  type EditorLayerViewState,
  type GeoJsonGeometry,
} from "../types/editorTypes";

type EditorStoreState = {
  document: EditorDocument | null;
  activeLayerId: string | null;
  selectedFeatureIds: string[];
  hoveredFeatureId: string | null;
  toolMode: EditorToolMode;
  dirty: boolean;
};

type EditorStoreActions = {
  setDocument: (document: EditorDocument) => void;
  resetDocument: (document?: EditorDocument) => void;
  setActiveLayerId: (layerId: string | null) => void;
  setHoveredFeatureId: (featureId: string | null) => void;
  setSelectedFeatureIds: (featureIds: string[]) => void;
  setToolMode: (toolMode: EditorToolMode) => void;
  updateLayerView: (
    layerId: string,
    view: Partial<EditorLayerViewState>,
  ) => void;
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

const initialDocument = sampleEditorDocument;

export const useEditorStore = create<EditorStore>((set) => ({
  document: initialDocument,
  activeLayerId: getInitialActiveLayerId(initialDocument),
  selectedFeatureIds: [],
  hoveredFeatureId: null,
  toolMode: EditorToolMode.Select,
  dirty: false,
  setDocument: (document) =>
    set({
      document,
      activeLayerId: getInitialActiveLayerId(document),
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      dirty: false,
    }),
  resetDocument: (document = initialDocument) =>
    set({
      document,
      activeLayerId: getInitialActiveLayerId(document),
      selectedFeatureIds: [],
      hoveredFeatureId: null,
      toolMode: EditorToolMode.Select,
      dirty: false,
    }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
  setHoveredFeatureId: (hoveredFeatureId) => set({ hoveredFeatureId }),
  setSelectedFeatureIds: (selectedFeatureIds) => set({ selectedFeatureIds }),
  setToolMode: (toolMode) => set({ toolMode }),
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
