import {
  EditabilityState,
  FeatureLifecycle,
  geometryKindFromGeometry,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
} from "../types/editorTypes";
import type {
  EditorCoordinate,
  EditorFeature,
  EditorFeatureInput,
  EditorLayer,
  EditorLayerBehavior,
  EditorScene,
  EditorSceneInput,
  GeoJsonGeometry,
} from "../types/editorTypes";

// 최소 입력(EditorSceneInput, v2)을 내부 리치 모델(EditorScene)로 변환합니다.
// 입력은 도형 목록뿐이며, 도형 하나당 내부 레이어 하나를 만들어 쌓습니다(1레이어 = 1도형).
// 배열 순서 = 그리는 순서(뒤가 위). 호스트가 생략한 값을 기본값/파생값으로 채웁니다:
// id 생성, geometryKind 파생, 잠금→권한, 기본 상태, 폴리곤 ring 닫기.
// 순수 함수이며 OpenLayers/React에 의존하지 않습니다.

// 닫힌 링의 마지막 좌표가 첫 좌표와 같도록 보장합니다(폴리곤 입력 안전망).
function closeRing(ring: EditorCoordinate[]): EditorCoordinate[] {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, [first[0], first[1]]];
}

function closeGeometryRings(geometry: GeoJsonGeometry): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(closeRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) => polygon.map(closeRing)),
    };
  }
  return geometry;
}

// 잠금 여부 → 레이어 권한. 잠금 = 읽기 전용 = 참고용(패널 선택은 가능, 변경 불가).
function layerBehaviorFor(locked: boolean): EditorLayerBehavior {
  if (locked) {
    return {
      lock: LockState.Locked,
      editability: EditabilityState.Readonly,
      selectable: true,
      deletable: false,
      draggable: false,
    };
  }
  return {
    lock: LockState.Unlocked,
    editability: EditabilityState.Editable,
    selectable: true,
    deletable: true,
    draggable: true,
  };
}

function normalizeFeature(
  input: EditorFeatureInput,
  featureId: string,
  lifecycle: FeatureLifecycle,
): EditorFeature {
  const geometry = closeGeometryRings(input.geometry);
  const properties =
    input.properties ?? (input.name !== undefined ? { label: input.name } : undefined);

  const feature: EditorFeature = {
    id: featureId,
    name: input.name,
    geometryKind: geometryKindFromGeometry(input.geometry),
    feature: { type: "Feature", id: featureId, geometry, properties },
    state: {
      selection: SelectionState.None,
      lifecycle,
      validation: ValidationState.Valid,
      issues: [],
    },
  };

  if (input.themeToken !== undefined) {
    feature.style = { themeToken: input.themeToken };
  }

  return feature;
}

// 도형 입력 하나를 "그 도형만 담는 내부 레이어"로 만듭니다(1레이어 = 1도형).
// 표시/잠금은 레이어 단위 값으로 옮겨 기존 렌더·게이팅 파이프라인을 그대로 씁니다.
// id·쌓임 값·lifecycle을 호출부가 정합니다: INIT은 index 기반(=Clean), 붙여넣기는 고유 id·최상단(=Created).
export function createFeatureLayer(
  input: EditorFeatureInput,
  options: { featureId: string; zIndex: number; lifecycle: FeatureLifecycle },
): EditorLayer {
  const { featureId, zIndex, lifecycle } = options;
  const locked = input.locked ?? false;
  const feature = normalizeFeature(input, featureId, lifecycle);

  return {
    id: `layer-${featureId}`,
    name: input.name ?? featureId,
    // 테마 기본값(잠금=참고 회색, 해제=편집 파랑)이 역할에서 파생되므로 함께 둡니다.
    roles: [locked ? LayerRole.Reference : LayerRole.Editable],
    geometryKinds: [feature.geometryKind],
    view: {
      visibility:
        input.visible === false ? VisibilityState.Hidden : VisibilityState.Visible,
      opacity: 1,
      zIndex,
      labelVisible: true,
    },
    behavior: layerBehaviorFor(locked),
    features: [feature],
  };
}

// INIT 입력의 도형 하나를 내부 레이어로 펼칩니다.
// 배열 순서 = 그리는 순서(뒤가 위)이라 쌓임 값을 10 간격으로 두고, lifecycle은 Clean(원본).
function toFeatureLayer(input: EditorFeatureInput, index: number): EditorLayer {
  return createFeatureLayer(input, {
    featureId: input.id ?? `feature-${index}`,
    // 재정렬 여지를 위해 10 간격.
    zIndex: (index + 1) * 10,
    lifecycle: FeatureLifecycle.Clean,
  });
}

export function normalizeSceneInput(input: EditorSceneInput): EditorScene {
  return {
    version: 1,
    id: input.id,
    name: input.name,
    viewport: input.viewport
      ? { center: input.viewport.center, zoom: input.viewport.zoom }
      : undefined,
    layers: input.features.map(toFeatureLayer),
  };
}

// 기존 scene과 충돌하지 않는 새 feature/layer id를 만듭니다(feature/layer 두 네임스페이스 모두 확인).
// findDuplicateIds가 거르는 충돌(명시 id 끼리·자동 생성과의 충돌)을 애초에 만들지 않도록 합니다.
function makeUniqueFeatureId(
  usedFeatureIds: Set<string>,
  usedLayerIds: Set<string>,
): string {
  let counter = usedFeatureIds.size;
  let featureId = `feature-${counter}`;
  while (usedFeatureIds.has(featureId) || usedLayerIds.has(`layer-${featureId}`)) {
    counter += 1;
    featureId = `feature-${counter}`;
  }
  usedFeatureIds.add(featureId);
  usedLayerIds.add(`layer-${featureId}`);
  return featureId;
}

// 도형 입력들을 scene 맨 위(스택 top)에 새 도형으로 추가합니다(붙여넣기·그리기 공용 프리미티브).
// - id는 입력값을 무시하고 항상 새로 생성합니다(충돌 방지). 입력의 명시 id는 쓰지 않습니다.
// - 새 도형은 FeatureLifecycle.Created로 두고, 쌓임 값은 현재 최댓값 위로 10 간격씩 올립니다.
// - 추가된 feature id 목록을 함께 반환해 호출부가 선택을 새 도형으로 옮길 수 있게 합니다.
// 빈 입력이면 원본 scene 참조와 빈 id 목록을 그대로 반환합니다(no-op).
export function addFeaturesToScene(
  scene: EditorScene,
  inputs: ReadonlyArray<EditorFeatureInput>,
): { scene: EditorScene; addedFeatureIds: string[] } {
  if (inputs.length === 0) {
    return { scene, addedFeatureIds: [] };
  }

  const usedFeatureIds = new Set<string>();
  const usedLayerIds = new Set<string>();
  let topZIndex = 0;
  for (const layer of scene.layers) {
    usedLayerIds.add(layer.id);
    topZIndex = Math.max(topZIndex, layer.view.zIndex);
    for (const feature of layer.features) {
      usedFeatureIds.add(feature.id);
    }
  }

  const addedFeatureIds: string[] = [];
  const newLayers = inputs.map((input) => {
    const featureId = makeUniqueFeatureId(usedFeatureIds, usedLayerIds);
    addedFeatureIds.push(featureId);
    topZIndex += 10;
    return createFeatureLayer(input, {
      featureId,
      zIndex: topZIndex,
      lifecycle: FeatureLifecycle.Created,
    });
  });

  return {
    scene: { ...scene, layers: [...scene.layers, ...newLayers] },
    addedFeatureIds,
  };
}

// 정규화된 scene에서 중복 id를 찾습니다(레이어/피처는 각각의 네임스페이스).
// 피처 id는 선택·수정·스타일 무효화의 전역 키이므로 중복이면 동작이 꼬입니다.
// 명시 id끼리의 중복뿐 아니라 명시 id가 자동 생성 id와 충돌하는 경우도 잡힙니다.
export function findDuplicateIds(scene: EditorScene): string[] {
  const duplicates: string[] = [];
  const seenLayerIds = new Set<string>();
  const seenFeatureIds = new Set<string>();

  for (const layer of scene.layers) {
    if (seenLayerIds.has(layer.id)) {
      duplicates.push(layer.id);
    } else {
      seenLayerIds.add(layer.id);
    }
    for (const feature of layer.features) {
      if (seenFeatureIds.has(feature.id)) {
        duplicates.push(feature.id);
      } else {
        seenFeatureIds.add(feature.id);
      }
    }
  }

  return duplicates;
}
