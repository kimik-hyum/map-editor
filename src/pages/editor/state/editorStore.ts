import { create } from "zustand";
import {
  BoundaryKind,
  EditorMode,
  FeatureLifecycle,
  GeometryKind,
  VisibilityState,
  type DrawShape,
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

// 그리기 도구의 기본 도형입니다.
const DEFAULT_DRAW_SHAPE: DrawShape = GeometryKind.Polygon;

// 되돌리기 이력의 최대 길이입니다. 초과하면 가장 오래된 스냅샷부터 버립니다.
const HISTORY_LIMIT = 50;

type EditorStoreState = {
  sessionId: string | null;
  scene: EditorScene | null;
  // 편집 히스토리: past=되돌리기 스택, future=다시하기 스택, baselineScene=INIT 기준점(dirty 판정용).
  past: EditorScene[];
  future: EditorScene[];
  baselineScene: EditorScene | null;
  activeLayerId: string | null;
  selectedFeatureIds: string[];
  hoveredFeatureId: string | null;
  activeMode: EditorMode;
  activeBoundaryKind: BoundaryKind;
  activeDrawShape: DrawShape;
  dirty: boolean;
};

type EditorStoreActions = {
  initializeFromMessage: (message: EditorInitMessage) => void;
  setScene: (scene: EditorScene) => void;
  resetScene: () => void;
  undo: () => void;
  redo: () => void;
  setActiveLayerId: (layerId: string | null) => void;
  setHoveredFeatureId: (featureId: string | null) => void;
  setSelectedFeatureIds: (featureIds: string[]) => void;
  setActiveMode: (mode: EditorMode) => void;
  setActiveBoundaryKind: (kind: BoundaryKind) => void;
  setActiveDrawShape: (shape: DrawShape) => void;
  updateLayerView: (layerId: string, view: Partial<EditorLayerViewState>) => void;
  updateFeatureView: (featureId: string, view: Partial<EditorFeatureViewState>) => void;
  updateFeatureGeometry: (featureId: string, geometry: GeoJsonGeometry) => void;
};

export type EditorStore = EditorStoreState & EditorStoreActions;

function getInitialActiveLayerId(scene: EditorScene | null) {
  return scene?.layers[0]?.id ?? null;
}

// undo/redo로 복원된 scene에 더 이상 존재하지 않는 피처를 가리키는 선택을 정리합니다.
function reconcileSelection(
  selectedFeatureIds: string[],
  scene: EditorScene,
): string[] {
  const existing = new Set<string>();
  for (const layer of scene.layers) {
    for (const feature of layer.features) {
      existing.add(feature.id);
    }
  }

  const filtered = selectedFeatureIds.filter((id) => existing.has(id));
  return filtered.length === selectedFeatureIds.length ? selectedFeatureIds : filtered;
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

export const useEditorStore = create<EditorStore>((set) => {
  // 편집(데이터 변경) 액션만 이 경로로 통과시켜 직전 scene을 past에 push하고 future를 비웁니다.
  // 가시성/잠금/선택/모드 변경은 이 경로를 거치지 않습니다(silent → 단독 undo 대상 아님).
  const commitSceneEdit = (produce: (scene: EditorScene) => EditorScene) =>
    set((state) => {
      if (!state.scene) {
        return {};
      }

      const next = produce(state.scene);
      if (next === state.scene) {
        return {};
      }

      const past = [...state.past, state.scene];

      return {
        scene: next,
        past:
          past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
        future: [],
        dirty: next !== state.baselineScene,
      };
    });

  return {
    sessionId: null,
    scene: null,
    past: [],
    future: [],
    baselineScene: null,
    activeLayerId: null,
    selectedFeatureIds: [],
    hoveredFeatureId: null,
    activeMode: DEFAULT_EDITOR_MODE,
    activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
    activeDrawShape: DEFAULT_DRAW_SHAPE,
    dirty: false,
    initializeFromMessage: (message) =>
      set({
        sessionId: message.sessionId,
        scene: message.scene,
        past: [],
        future: [],
        baselineScene: message.scene,
        activeLayerId: getInitialActiveLayerId(message.scene),
        selectedFeatureIds: [],
        hoveredFeatureId: null,
        activeMode: DEFAULT_EDITOR_MODE,
        activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
        activeDrawShape: DEFAULT_DRAW_SHAPE,
        dirty: false,
      }),
    setScene: (scene) =>
      set({
        scene,
        past: [],
        future: [],
        baselineScene: scene,
        activeLayerId: getInitialActiveLayerId(scene),
        selectedFeatureIds: [],
        hoveredFeatureId: null,
        dirty: false,
      }),
    resetScene: () =>
      set({
        sessionId: null,
        scene: null,
        past: [],
        future: [],
        baselineScene: null,
        activeLayerId: null,
        selectedFeatureIds: [],
        hoveredFeatureId: null,
        activeMode: DEFAULT_EDITOR_MODE,
        activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
        activeDrawShape: DEFAULT_DRAW_SHAPE,
        dirty: false,
      }),
    undo: () =>
      set((state) => {
        const previous = state.past[state.past.length - 1];
        if (!previous || !state.scene) {
          return {};
        }

        return {
          scene: previous,
          past: state.past.slice(0, -1),
          future: [state.scene, ...state.future],
          selectedFeatureIds: reconcileSelection(state.selectedFeatureIds, previous),
          dirty: previous !== state.baselineScene,
        };
      }),
    redo: () =>
      set((state) => {
        const next = state.future[0];
        if (!next || !state.scene) {
          return {};
        }

        return {
          scene: next,
          past: [...state.past, state.scene],
          future: state.future.slice(1),
          selectedFeatureIds: reconcileSelection(state.selectedFeatureIds, next),
          dirty: next !== state.baselineScene,
        };
      }),
    setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
    setHoveredFeatureId: (hoveredFeatureId) => set({ hoveredFeatureId }),
    setSelectedFeatureIds: (selectedFeatureIds) => set({ selectedFeatureIds }),
    setActiveMode: (activeMode) => set({ activeMode }),
    setActiveBoundaryKind: (activeBoundaryKind) => set({ activeBoundaryKind }),
    setActiveDrawShape: (activeDrawShape) => set({ activeDrawShape }),
    // 가시성/잠금 등 뷰 변경은 히스토리에 쌓지 않습니다(silent). dirty만 baseline 대비로 갱신합니다.
    updateLayerView: (layerId, view) =>
      set((state) => {
        if (!state.scene) {
          return {};
        }

        const next = updateLayerViewInScene(state.scene, layerId, view);
        return { scene: next, dirty: next !== state.baselineScene };
      }),
    updateFeatureView: (featureId, view) =>
      set((state) => {
        if (!state.scene) {
          return {};
        }

        const next = updateFeatureViewInScene(state.scene, featureId, view);
        return { scene: next, dirty: next !== state.baselineScene };
      }),
    // geometry 변경은 편집이므로 히스토리에 스냅샷을 남깁니다.
    updateFeatureGeometry: (featureId, geometry) =>
      commitSceneEdit((scene) =>
        updateFeatureGeometryInScene(scene, featureId, geometry),
      ),
  };
});
