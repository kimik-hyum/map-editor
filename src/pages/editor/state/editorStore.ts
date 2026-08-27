import { create } from "zustand";
import { addFeaturesToScene } from "../messaging/normalizeSceneInput";
import {
  canDeleteCreatedFeature,
  canRenameFeature,
  EditabilityState,
  EditorMode,
  FeatureLifecycle,
  geometryKindFromGeometry,
  GeometryKind,
  LayerRole,
  LockState,
  normalizeFeatureName,
  VisibilityState,
  type DeepReadonly,
  type DrawShape,
  type EditorFeatureInput,
  type EditorScene,
  type EditorFeatureViewState,
  type EditorLayerViewState,
  type EditorInitMessage,
  type GeoJsonGeometry,
} from "../types/editorTypes";

// 편집 모드의 기본값입니다. 모드 패널의 초기 선택과 store 초기화가 같은 값을 공유합니다.
const DEFAULT_EDITOR_MODE = EditorMode.Select;

// 경계 도구의 기본 경계 종류입니다.
const DEFAULT_BOUNDARY_KIND = "adminDong";

// 그리기 도구의 기본 도형입니다.
const DEFAULT_DRAW_SHAPE: DrawShape = GeometryKind.Polygon;

// 되돌리기 이력의 최대 길이입니다. 초과하면 가장 오래된 스냅샷부터 버립니다.
export const HISTORY_LIMIT = 50;

// 히스토리에 보관하는 scene 스냅샷은 깊은 읽기 전용으로 노출합니다.
// 소비처의 제자리 변경을 컴파일 단계에서 막습니다(런타임 비용 없음).
type ReadonlyScene = DeepReadonly<EditorScene>;

// 패널 등에서 "이 도형이 보이게 지도를 옮겨 달라"는 1회성 요청입니다.
// 같은 도형을 연속 요청해도 구분되도록 증가하는 요청 번호를 함께 둡니다(소비는 map hook).
type FeatureFocusRequest = {
  featureId: string;
  requestId: number;
};

type EditorStoreState = {
  sessionId: string | null;
  scene: ReadonlyScene | null;
  // 편집 히스토리: past=되돌리기 스택, future=다시하기 스택, baselineScene=INIT 기준점(dirty 판정용).
  past: readonly ReadonlyScene[];
  future: readonly ReadonlyScene[];
  baselineScene: ReadonlyScene | null;
  activeLayerId: string | null;
  selectedFeatureIds: string[];
  hoveredFeatureId: string | null;
  featureFocusRequest: FeatureFocusRequest | null;
  // 레이어 행의 이름 입력이 열려 있는 도형. 다른 종료 액션과 beforeunload가 초안 유실을 막는 데 사용합니다.
  renamingFeatureId: string | null;
  activeMode: EditorMode;
  activeBoundaryKind: string | null;
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
  requestFeatureFocus: (featureId: string) => void;
  consumeFeatureFocusRequest: (requestId: number) => void;
  beginFeatureRename: (featureId: string) => void;
  endFeatureRename: () => void;
  setActiveMode: (mode: EditorMode) => void;
  setActiveBoundaryKind: (kind: string | null) => void;
  setActiveDrawShape: (shape: DrawShape) => void;
  updateLayerView: (layerId: string, view: Partial<EditorLayerViewState>) => void;
  updateLayerZIndexes: (
    updates: ReadonlyArray<{ layerId: string; zIndex: number }>,
  ) => void;
  setLayerLocked: (layerId: string, locked: boolean) => void;
  updateFeatureView: (featureId: string, view: Partial<EditorFeatureViewState>) => void;
  addFeatures: (inputs: ReadonlyArray<EditorFeatureInput>) => void;
  deleteCreatedFeature: (featureId: string) => void;
  renameFeature: (featureId: string, name: string) => void;
  updateFeatureGeometry: (featureId: string, geometry: GeoJsonGeometry) => void;
  updateFeaturesGeometry: (
    updates: ReadonlyArray<{ featureId: string; geometry: GeoJsonGeometry }>,
  ) => void;
  mergeFeatures: (targetId: string, otherId: string, geometry: GeoJsonGeometry) => void;
  subtractFeature: (targetId: string, geometry: GeoJsonGeometry | null) => void;
};

export type EditorStore = EditorStoreState & EditorStoreActions;

function getInitialActiveLayerId(scene: ReadonlyScene | null) {
  return scene?.layers[0]?.id ?? null;
}

function canContinueFeatureRename(scene: ReadonlyScene, featureId: string): boolean {
  for (const layer of scene.layers) {
    const feature = layer.features.find((candidate) => candidate.id === featureId);
    if (feature) {
      return canRenameFeature(layer, feature);
    }
  }

  return false;
}

// undo/redo로 복원된 scene에 더 이상 존재하지 않는 피처를 가리키는 선택을 정리합니다.
function reconcileSelection(
  selectedFeatureIds: string[],
  scene: ReadonlyScene,
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

// geometry 값 동치 비교(MVP 수준). 동일 값 업데이트를 no-op으로 판정해 히스토리 오염을 막습니다.
function areGeometriesEqual(a: GeoJsonGeometry, b: GeoJsonGeometry): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// 뷰 객체(가시성/투명도 등)의 얕은 동치 비교. 값 변화가 없으면 dirty를 만들지 않기 위함입니다.
function isShallowEqual(a: object | undefined, b: object): boolean {
  if (a === b) {
    return true;
  }
  if (!a) {
    return false;
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => aRecord[key] === bRecord[key]);
}

// 실제 변경이 없으면(레이어 미발견·동일 값) 원본 scene 참조를 그대로 반환합니다.
function updateLayerViewInScene(
  scene: EditorScene,
  layerId: string,
  view: Partial<EditorLayerViewState>,
): EditorScene {
  let changed = false;

  const layers = scene.layers.map((layer) => {
    if (layer.id !== layerId) {
      return layer;
    }

    const nextView = { ...layer.view, ...view };
    if (isShallowEqual(layer.view, nextView)) {
      return layer;
    }

    changed = true;
    return { ...layer, view: nextView };
  });

  return changed ? { ...scene, layers } : scene;
}

// 여러 레이어의 쌓임 값을 한 번에 바꿉니다(순서 이동의 재정규화용).
// 전부 같은 값이면 원본 scene 참조를 그대로 반환합니다(no-op).
function updateLayerZIndexesInScene(
  scene: EditorScene,
  updates: ReadonlyArray<{ layerId: string; zIndex: number }>,
): EditorScene {
  const zIndexById = new Map(updates.map((update) => [update.layerId, update.zIndex]));
  let changed = false;

  const layers = scene.layers.map((layer) => {
    const zIndex = zIndexById.get(layer.id);
    if (zIndex === undefined || layer.view.zIndex === zIndex) {
      return layer;
    }
    changed = true;
    return { ...layer, view: { ...layer.view, zIndex } };
  });

  return changed ? { ...scene, layers } : scene;
}

// 잠금 = 읽기 전용 = 참고용. 잠금 여부에 따라 권한과 역할(테마 기본값)을 함께 일관되게 바꿉니다.
// 같은 상태면 원본 scene 참조를 그대로 반환합니다(no-op). 정규화의 잠금 매핑과 같은 규칙입니다.
function setLayerLockedInScene(
  scene: EditorScene,
  layerId: string,
  locked: boolean,
): EditorScene {
  let changed = false;

  const layers = scene.layers.map((layer) => {
    if (layer.id !== layerId) {
      return layer;
    }
    const isLocked = layer.behavior.lock === LockState.Locked;
    if (isLocked === locked) {
      return layer;
    }

    changed = true;
    return {
      ...layer,
      roles: [locked ? LayerRole.Reference : LayerRole.Editable],
      behavior: {
        ...layer.behavior,
        lock: locked ? LockState.Locked : LockState.Unlocked,
        editability: locked ? EditabilityState.Readonly : EditabilityState.Editable,
        // 잠금을 풀어도 부모 원본은 삭제 가능해지지 않습니다. 로컬 생성 레이어만 복원합니다.
        deletable:
          !locked &&
          layer.features.length === 1 &&
          layer.features[0]?.state.lifecycle === FeatureLifecycle.Created &&
          layer.features[0]?.behavior?.deletable !== false,
        draggable: !locked,
      },
    };
  });

  return changed ? { ...scene, layers } : scene;
}

// 로컬에서 생성된 도형만 제거합니다. 1레이어=1도형 구조라 비워진 내부 레이어도 함께 제거합니다.
// UI가 버튼을 숨겨도 직접 호출될 수 있으므로 lifecycle·권한·잠금을 store 경계에서 다시 확인합니다.
function deleteCreatedFeatureInScene(
  scene: EditorScene,
  featureId: string,
): EditorScene {
  let changed = false;
  const layers: EditorScene["layers"] = [];

  for (const layer of scene.layers) {
    const feature = layer.features.find((candidate) => candidate.id === featureId);
    if (!feature || !canDeleteCreatedFeature(layer, feature)) {
      layers.push(layer);
      continue;
    }

    const features = layer.features.filter((candidate) => candidate.id !== featureId);
    changed = true;
    if (features.length > 0) {
      layers.push({ ...layer, features });
    }
  }

  return changed ? { ...scene, layers } : scene;
}

// 도형 이름은 feature.name을 공개 기준으로 사용하고, 1레이어=1도형 내부 이름도 함께 맞춥니다.
// properties.label은 부모가 제공한 임의 속성이므로 덮어쓰지 않습니다.
function renameFeatureInScene(
  scene: EditorScene,
  featureId: string,
  name: string,
): EditorScene {
  const normalizedName = normalizeFeatureName(name);
  if (!normalizedName) {
    return scene;
  }

  let changed = false;
  const layers = scene.layers.map((layer) => {
    const target = layer.features.find((feature) => feature.id === featureId);
    if (!target || target.name === normalizedName || !canRenameFeature(layer, target)) {
      return layer;
    }

    changed = true;
    return {
      ...layer,
      name: normalizedName,
      features: layer.features.map((feature) =>
        feature.id === featureId
          ? {
              ...feature,
              name: normalizedName,
              state: {
                ...feature.state,
                lifecycle:
                  feature.state.lifecycle === FeatureLifecycle.Created
                    ? FeatureLifecycle.Created
                    : FeatureLifecycle.Updated,
              },
            }
          : feature,
      ),
    };
  });

  return changed ? { ...scene, layers } : scene;
}

// 대상 피처가 없거나 동일 geometry이면 원본 scene 참조를 그대로 반환합니다(no-op).
// geometryKind는 geometry에서만 파생하므로, 모든 geometry 교체 경로에서 함께 갱신합니다.
function updateFeatureGeometryInScene(
  scene: EditorScene,
  featureId: string,
  geometry: GeoJsonGeometry,
): EditorScene {
  let changed = false;

  const layers = scene.layers.map((layer) => {
    let layerChanged = false;

    const features = layer.features.map((feature) => {
      if (feature.id !== featureId) {
        return feature;
      }
      if (areGeometriesEqual(feature.feature.geometry, geometry)) {
        return feature;
      }

      layerChanged = true;
      changed = true;
      return {
        ...feature,
        geometryKind: geometryKindFromGeometry(geometry),
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
    });

    if (!layerChanged) {
      return layer;
    }

    return {
      ...layer,
      geometryKinds: Array.from(
        new Set(features.map((feature) => feature.geometryKind)),
      ),
      features,
    };
  });

  return changed ? { ...scene, layers } : scene;
}

// 여러 피처의 geometry를 한 번의 순회로 바꿉니다(다중 이동의 배치 커밋용).
// 대상이 없거나 전부 동일 geometry이면 원본 scene 참조를 그대로 반환합니다(no-op → 히스토리 없음).
function updateFeaturesGeometryInScene(
  scene: EditorScene,
  updates: ReadonlyArray<{ featureId: string; geometry: GeoJsonGeometry }>,
): EditorScene {
  if (updates.length === 0) {
    return scene;
  }

  const geometryById = new Map(
    updates.map((update) => [update.featureId, update.geometry]),
  );
  let changed = false;

  const layers = scene.layers.map((layer) => {
    let layerChanged = false;

    const features = layer.features.map((feature) => {
      const geometry = geometryById.get(feature.id);
      if (geometry === undefined) {
        return feature;
      }
      if (areGeometriesEqual(feature.feature.geometry, geometry)) {
        return feature;
      }

      layerChanged = true;
      changed = true;
      return {
        ...feature,
        geometryKind: geometryKindFromGeometry(geometry),
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
    });

    if (!layerChanged) {
      return layer;
    }

    return {
      ...layer,
      geometryKinds: Array.from(
        new Set(features.map((feature) => feature.geometryKind)),
      ),
      features,
    };
  });

  return changed ? { ...scene, layers } : scene;
}

// 불리언 연산으로 바뀐 target 피처를 새 geometry/geometryKind/lifecycle로 교체한 사본을 만듭니다.
// 1레이어 = 1도형 평탄 스택이므로, target이 든 레이어의 geometryKinds도 함께 갱신합니다.
function replaceFeatureGeometry(
  feature: EditorScene["layers"][number]["features"][number],
  geometry: GeoJsonGeometry,
  kind: GeometryKind,
  deletable?: boolean,
) {
  return {
    ...feature,
    geometryKind: kind,
    feature: { ...feature.feature, geometry },
    state: {
      ...feature.state,
      lifecycle:
        feature.state.lifecycle === FeatureLifecycle.Created
          ? FeatureLifecycle.Created
          : FeatureLifecycle.Updated,
    },
    ...(deletable === undefined
      ? {}
      : { behavior: { ...feature.behavior, deletable } }),
  };
}

// 병합(union): target geometry/kind를 결과로 교체하고 other 피처를 제거합니다(원자적 1편집).
// 평탄 스택에서 other를 빼 빈 레이어가 되면 그 레이어도 함께 드롭합니다.
// 둘 중 하나라도 없으면 원본 scene 참조를 그대로 반환합니다(no-op).
function mergeFeaturesInScene(
  scene: EditorScene,
  targetId: string,
  otherId: string,
  geometry: GeoJsonGeometry,
): EditorScene {
  if (targetId === otherId) {
    return scene;
  }

  const targetFeature = scene.layers
    .flatMap((layer) => layer.features)
    .find((feature) => feature.id === targetId);
  const otherFeature = scene.layers
    .flatMap((layer) => layer.features)
    .find((feature) => feature.id === otherId);
  if (!targetFeature || !otherFeature) {
    return scene;
  }

  // 로컬 생성 target이 부모 원본을 흡수하면 결과도 원본 데이터를 포함합니다.
  // feature 수준에 삭제 금지를 고정해 잠금 해제 후에도 직접 삭제로 원본 보호를 우회하지 못하게 합니다.
  const consumesProtectedSource =
    otherFeature.state.lifecycle !== FeatureLifecycle.Created ||
    otherFeature.behavior?.deletable === false;

  const kind = geometryKindFromGeometry(geometry);
  const layers: EditorScene["layers"] = [];

  for (const layer of scene.layers) {
    const hadOther = layer.features.some((feature) => feature.id === otherId);

    let features = hadOther
      ? layer.features.filter((feature) => feature.id !== otherId)
      : layer.features;

    const hasTarget = features.some((feature) => feature.id === targetId);
    if (hasTarget) {
      features = features.map((feature) =>
        feature.id === targetId
          ? replaceFeatureGeometry(
              feature,
              geometry,
              kind,
              consumesProtectedSource ? false : undefined,
            )
          : feature,
      );
    }

    // other를 빼 비워진 레이어는 드롭한다(평탄 스택: other가 단독으로 든 레이어).
    if (hadOther && features.length === 0) {
      continue;
    }

    if (!hadOther && !hasTarget) {
      layers.push(layer);
      continue;
    }

    layers.push(
      hasTarget
        ? {
            ...layer,
            geometryKinds: [kind],
            behavior: consumesProtectedSource
              ? { ...layer.behavior, deletable: false }
              : layer.behavior,
            features,
          }
        : { ...layer, features },
    );
  }

  return { ...scene, layers };
}

// 제거(difference): 결과 geometry로 target을 교체하고, 결과가 비면(null) target을 삭제합니다.
// cutter는 건드리지 않습니다. target이 없거나 결과가 기존 geometry와 동일하면(겹침 없는 difference 등)
// 원본 scene 참조를 그대로 반환합니다(no-op → 히스토리 오염 방지).
function subtractFeatureInScene(
  scene: EditorScene,
  targetId: string,
  geometry: GeoJsonGeometry | null,
): EditorScene {
  let changed = false;
  const layers: EditorScene["layers"] = [];

  for (const layer of scene.layers) {
    const targetFeature = layer.features.find((feature) => feature.id === targetId);
    if (!targetFeature) {
      layers.push(layer);
      continue;
    }

    if (geometry === null) {
      // 빈 결과 → target 삭제. 평탄 스택에서 비워진 레이어는 드롭한다.
      const features = layer.features.filter((feature) => feature.id !== targetId);
      changed = true;
      if (features.length === 0) {
        continue;
      }
      layers.push({ ...layer, features });
      continue;
    }

    // 동일 geometry면 교체하지 않는다(공개 액션이라 stale 후보·직접 호출로 무변경 결과가 올 수 있음).
    if (areGeometriesEqual(targetFeature.feature.geometry, geometry)) {
      layers.push(layer);
      continue;
    }

    const kind = geometryKindFromGeometry(geometry);
    const features = layer.features.map((feature) =>
      feature.id === targetId
        ? replaceFeatureGeometry(feature, geometry, kind)
        : feature,
    );
    changed = true;
    layers.push({ ...layer, geometryKinds: [kind], features });
  }

  return changed ? { ...scene, layers } : scene;
}

// 대상 피처가 없거나 동일 값이면 원본 scene 참조를 그대로 반환합니다(no-op).
function updateFeatureViewInScene(
  scene: EditorScene,
  featureId: string,
  view: Partial<EditorFeatureViewState>,
): EditorScene {
  let changed = false;

  const layers = scene.layers.map((layer) => {
    let layerChanged = false;

    const features = layer.features.map((feature) => {
      if (feature.id !== featureId) {
        return feature;
      }

      // 현재 뷰를 기본값까지 포함해 정규화한 뒤 비교합니다.
      // feature.view가 없어도 기본 visibility와 동일한 설정은 no-op으로 판정합니다.
      const currentView = {
        visibility: feature.view?.visibility ?? VisibilityState.Visible,
        ...(feature.view ?? {}),
      };
      const nextView = { ...currentView, ...view };
      if (isShallowEqual(currentView, nextView)) {
        return feature;
      }

      layerChanged = true;
      changed = true;
      return { ...feature, view: nextView };
    });

    return layerChanged ? { ...layer, features } : layer;
  });

  return changed ? { ...scene, layers } : scene;
}

export const useEditorStore = create<EditorStore>((set) => {
  // 편집(데이터 변경) 액션만 이 경로로 통과시켜 직전 scene을 past에 push하고 future를 비웁니다.
  // 변경이 없으면(producer가 원본 scene 참조 반환) 스냅샷을 만들지 않습니다.
  // 가시성/잠금/선택/모드 변경은 이 경로를 거치지 않습니다(silent → 단독 undo 대상 아님).
  const commitSceneEdit = (produce: (scene: EditorScene) => EditorScene) =>
    set((state) => {
      if (!state.scene) {
        return {};
      }

      const next = produce(state.scene as EditorScene);
      if (next === state.scene) {
        return {};
      }

      const past = [...state.past, state.scene];

      return {
        scene: next,
        past:
          past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
        future: [],
        // 구조 편집(병합/제거)으로 사라진 피처를 가리키는 선택을 정리한다.
        // 변경이 없으면 reconcileSelection이 같은 배열 참조를 반환해 불필요한 리렌더가 없다.
        selectedFeatureIds: reconcileSelection(state.selectedFeatureIds, next),
        renamingFeatureId:
          state.renamingFeatureId &&
          canContinueFeatureRename(next, state.renamingFeatureId)
            ? state.renamingFeatureId
            : null,
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
    featureFocusRequest: null,
    renamingFeatureId: null,
    activeMode: DEFAULT_EDITOR_MODE,
    activeBoundaryKind: DEFAULT_BOUNDARY_KIND,
    activeDrawShape: DEFAULT_DRAW_SHAPE,
    dirty: false,
    // 주의: INIT/setScene은 입력 scene의 소유권을 store가 가져갑니다(참조를 그대로 보관).
    // 외부 코드가 같은 참조를 들고 제자리 변경하면 안 됩니다. 저장/제출 안정성이 중요해지면
    // 경계 복사(structuredClone)를 검토합니다(#27).
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
        featureFocusRequest: null,
        renamingFeatureId: null,
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
        featureFocusRequest: null,
        renamingFeatureId: null,
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
        featureFocusRequest: null,
        renamingFeatureId: null,
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
    // 호버는 pointermove 핫패스라, 같은 id면 상태 갱신·구독 알림을 건너뛴다.
    setHoveredFeatureId: (hoveredFeatureId) =>
      set((state) =>
        state.hoveredFeatureId === hoveredFeatureId ? state : { hoveredFeatureId },
      ),
    setSelectedFeatureIds: (selectedFeatureIds) => set({ selectedFeatureIds }),
    // "이 도형이 보이게 지도를 옮겨 달라"는 1회성 요청. 같은 도형 연속 요청도 번호로 구분된다.
    requestFeatureFocus: (featureId) =>
      set((state) => ({
        featureFocusRequest: {
          featureId,
          requestId: (state.featureFocusRequest?.requestId ?? 0) + 1,
        },
      })),
    // 처리한 요청을 비워 1회성 계약을 보장한다(리마운트 시 재생 방지).
    // 처리 중 새 요청이 들어왔을 수 있으므로, 같은 번호일 때만 비운다.
    consumeFeatureFocusRequest: (requestId) =>
      set((state) =>
        state.featureFocusRequest?.requestId === requestId
          ? { featureFocusRequest: null }
          : {},
      ),
    beginFeatureRename: (featureId) =>
      set((state) =>
        state.scene && canContinueFeatureRename(state.scene, featureId)
          ? { renamingFeatureId: featureId }
          : {},
      ),
    endFeatureRename: () =>
      set((state) =>
        state.renamingFeatureId === null ? {} : { renamingFeatureId: null },
      ),
    setActiveMode: (activeMode) => set({ activeMode }),
    setActiveBoundaryKind: (activeBoundaryKind) => set({ activeBoundaryKind }),
    setActiveDrawShape: (activeDrawShape) => set({ activeDrawShape }),
    // 가시성/잠금 등 뷰 변경은 히스토리에 쌓지 않습니다(silent). 실제 변경이 있을 때만 dirty를 갱신합니다.
    updateLayerView: (layerId, view) =>
      set((state) => {
        if (!state.scene) {
          return {};
        }

        const next = updateLayerViewInScene(state.scene as EditorScene, layerId, view);
        if (next === state.scene) {
          return {};
        }

        return {
          scene: next,
          renamingFeatureId:
            state.renamingFeatureId &&
            canContinueFeatureRename(next, state.renamingFeatureId)
              ? state.renamingFeatureId
              : null,
          dirty: next !== state.baselineScene,
        };
      }),
    // 순서(쌓임 값) 이동도 silent(히스토리 X) — 보임/잠금과 같은 뷰 정책. 변경 시에만 dirty 갱신.
    updateLayerZIndexes: (updates) =>
      set((state) => {
        if (!state.scene) {
          return {};
        }

        const next = updateLayerZIndexesInScene(state.scene as EditorScene, updates);
        if (next === state.scene) {
          return {};
        }

        return { scene: next, dirty: next !== state.baselineScene };
      }),
    // 잠금 토글도 silent(히스토리 X). 변경이 있을 때만 dirty를 갱신합니다.
    setLayerLocked: (layerId, locked) =>
      set((state) => {
        if (!state.scene) {
          return {};
        }

        const next = setLayerLockedInScene(state.scene as EditorScene, layerId, locked);
        if (next === state.scene) {
          return {};
        }

        return {
          scene: next,
          renamingFeatureId:
            state.renamingFeatureId &&
            canContinueFeatureRename(next, state.renamingFeatureId)
              ? state.renamingFeatureId
              : null,
          dirty: next !== state.baselineScene,
        };
      }),
    updateFeatureView: (featureId, view) =>
      set((state) => {
        if (!state.scene) {
          return {};
        }

        const next = updateFeatureViewInScene(
          state.scene as EditorScene,
          featureId,
          view,
        );
        if (next === state.scene) {
          return {};
        }

        return { scene: next, dirty: next !== state.baselineScene };
      }),
    // 붙여넣기·그리기로 새 도형을 추가합니다(undo 1단계). 추가된 도형을 선택 상태로 만들어
    // 곧바로 이동/편집할 수 있게 합니다(commitSceneEdit는 선택을 못 바꿔 별도 set으로 작성).
    // 빈 입력이면 아무것도 하지 않습니다.
    addFeatures: (inputs) =>
      set((state) => {
        if (!state.scene || inputs.length === 0) {
          return {};
        }

        const { scene: next, addedFeatureIds } = addFeaturesToScene(
          state.scene as EditorScene,
          inputs,
        );
        if (next === state.scene) {
          return {};
        }

        const past = [...state.past, state.scene];
        return {
          scene: next,
          past:
            past.length > HISTORY_LIMIT
              ? past.slice(past.length - HISTORY_LIMIT)
              : past,
          future: [],
          selectedFeatureIds: addedFeatureIds,
          dirty: next !== state.baselineScene,
        };
      }),
    // 로컬 생성 레이어 삭제를 한 스냅샷(=undo 1단계)으로 커밋합니다.
    deleteCreatedFeature: (featureId) =>
      commitSceneEdit((scene) => deleteCreatedFeatureInScene(scene, featureId)),
    // 이름 변경도 부모 반환 데이터의 편집이므로 undo/redo 가능한 한 스냅샷으로 커밋합니다.
    renameFeature: (featureId, name) =>
      commitSceneEdit((scene) => renameFeatureInScene(scene, featureId, name)),
    // geometry 변경은 편집이므로 히스토리에 스냅샷을 남깁니다.
    updateFeatureGeometry: (featureId, geometry) =>
      commitSceneEdit((scene) =>
        updateFeatureGeometryInScene(scene, featureId, geometry),
      ),
    // 다중 이동 커밋: 여러 피처 geometry를 한 스냅샷(=undo 1단계)으로 묶습니다. 변경 0개면 히스토리 없음.
    updateFeaturesGeometry: (updates) =>
      commitSceneEdit((scene) => updateFeaturesGeometryInScene(scene, updates)),
    // 병합(union): target을 결과로 교체 + other 제거를 한 스냅샷(=undo 1단계)으로 커밋합니다.
    mergeFeatures: (targetId, otherId, geometry) =>
      commitSceneEdit((scene) =>
        mergeFeaturesInScene(scene, targetId, otherId, geometry),
      ),
    // 제거(difference): 결과로 target 교체(결과가 null이면 target 삭제)를 한 스냅샷으로 커밋합니다.
    subtractFeature: (targetId, geometry) =>
      commitSceneEdit((scene) => subtractFeatureInScene(scene, targetId, geometry)),
  };
});
