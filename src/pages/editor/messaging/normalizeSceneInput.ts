import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
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

const GEOMETRY_KIND_BY_TYPE: Record<GeoJsonGeometry["type"], GeometryKind> = {
  Point: GeometryKind.Point,
  MultiPoint: GeometryKind.MultiPoint,
  LineString: GeometryKind.Path,
  MultiLineString: GeometryKind.MultiPath,
  Polygon: GeometryKind.Polygon,
  MultiPolygon: GeometryKind.MultiPolygon,
};

function toGeometryKind(geometry: GeoJsonGeometry): GeometryKind {
  return GEOMETRY_KIND_BY_TYPE[geometry.type];
}

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

function normalizeFeature(input: EditorFeatureInput, featureId: string): EditorFeature {
  const geometry = closeGeometryRings(input.geometry);
  const properties =
    input.properties ?? (input.name !== undefined ? { label: input.name } : undefined);

  const feature: EditorFeature = {
    id: featureId,
    name: input.name,
    geometryKind: toGeometryKind(input.geometry),
    feature: { type: "Feature", id: featureId, geometry, properties },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
  };

  if (input.themeToken !== undefined) {
    feature.style = { themeToken: input.themeToken };
  }

  return feature;
}

// 도형 입력 하나를 "그 도형만 담는 내부 레이어"로 만듭니다.
// 표시/잠금은 레이어 단위 값으로 옮겨 기존 렌더·게이팅 파이프라인을 그대로 씁니다.
function toFeatureLayer(input: EditorFeatureInput, index: number): EditorLayer {
  const featureId = input.id ?? `feature-${index}`;
  const locked = input.locked ?? false;
  const feature = normalizeFeature(input, featureId);

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
      // 배열 순서 = 그리는 순서(뒤가 위). 재정렬 여지를 위해 10 간격.
      zIndex: (index + 1) * 10,
      labelVisible: true,
    },
    behavior: layerBehaviorFor(locked),
    features: [feature],
  };
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
