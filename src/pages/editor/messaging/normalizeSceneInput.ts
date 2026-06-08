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
  EditorLayerInput,
  EditorLayerRoleInput,
  EditorScene,
  EditorSceneInput,
  GeoJsonGeometry,
} from "../types/editorTypes";

// 최소 입력(EditorSceneInput, v2)을 내부 리치 모델(EditorScene)로 변환합니다.
// 호스트가 생략한 값을 기본값/파생값으로 채웁니다: id 생성, geometryKind 파생,
// role→behavior, state(Clean/Valid), view(Visible), 폴리곤 ring 닫기.
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

const ROLE_TO_LAYER_ROLE: Record<EditorLayerRoleInput, LayerRole> = {
  editable: LayerRole.Editable,
  reference: LayerRole.Reference,
  background: LayerRole.Background,
};

// role → 레이어 behavior. 미입력 role은 editable로 본다.
function layerBehaviorFor(role: EditorLayerRoleInput): EditorLayerBehavior {
  if (role === "editable") {
    return {
      lock: LockState.Unlocked,
      editability: EditabilityState.Editable,
      selectable: true,
      deletable: true,
      draggable: true,
    };
  }
  // reference / background 는 읽기 전용. background는 선택도 막는다.
  return {
    lock: LockState.Locked,
    editability: EditabilityState.Readonly,
    selectable: role !== "background",
    deletable: false,
    draggable: false,
  };
}

function normalizeFeature(
  input: EditorFeatureInput,
  layerId: string,
  index: number,
): EditorFeature {
  const id = input.id ?? `${layerId}-feature-${index}`;
  const geometry = closeGeometryRings(input.geometry);
  const properties =
    input.properties ?? (input.name !== undefined ? { label: input.name } : undefined);

  const feature: EditorFeature = {
    id,
    name: input.name,
    geometryKind: toGeometryKind(input.geometry),
    feature: { type: "Feature", id, geometry, properties },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
  };

  if (input.visible === false) {
    feature.view = { visibility: VisibilityState.Hidden };
  }
  if (input.themeToken !== undefined) {
    feature.style = { themeToken: input.themeToken };
  }

  return feature;
}

function normalizeLayer(input: EditorLayerInput, index: number): EditorLayer {
  const id = input.id ?? `layer-${index}`;
  const role: EditorLayerRoleInput = input.role ?? "editable";
  const features = input.features.map((feature, featureIndex) =>
    normalizeFeature(feature, id, featureIndex),
  );

  const geometryKinds = Array.from(new Set(features.map((f) => f.geometryKind)));

  return {
    id,
    name: input.name ?? id,
    roles: [ROLE_TO_LAYER_ROLE[role]],
    geometryKinds: geometryKinds.length > 0 ? geometryKinds : [GeometryKind.Polygon],
    view: {
      visibility:
        input.visible === false ? VisibilityState.Hidden : VisibilityState.Visible,
      opacity: input.opacity ?? 1,
      zIndex: input.zIndex ?? (index + 1) * 10,
      labelVisible: true,
    },
    behavior: layerBehaviorFor(role),
    features,
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
    layers: input.layers.map(normalizeLayer),
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
